window.App = window.App || {};

/**
 * Friends system. Unlike App.Storage, this is deliberately NOT part of the
 * synchronous preload-cache pattern -- friend requests/friendships involve
 * OTHER users' live state (someone could accept while you're looking at the
 * page), so every function here is a plain async query, and pages that use
 * it show a brief loading state the same way Auth.js already does for its
 * own async flow.
 */
App.Social = (function () {
  const db = App.Supabase;

  function profileRowToObj(row) {
    return {
      userId: row.user_id, name: row.name, profilePictureType: row.profile_picture_type,
      profilePictureUrl: row.profile_picture_url, presetAvatarId: row.preset_avatar_id,
    };
  }

  // Resolves a shareable public_id to the user behind it -- only ever used
  // before any relationship exists yet, so the RPC (security definer)
  // exposes just identity fields, never age/bodyweight.
  function findUserByPublicId(publicId) {
    return db.rpc('find_user_by_public_id', { p_public_id: publicId }).then(function (res) {
      if (res.error) {
        console.error('[Social] findUserByPublicId failed:', res.error);
        return null;
      }
      const row = res.data && res.data[0];
      return row ? profileRowToObj(row) : null;
    });
  }

  // Batched name/avatar lookup for a list of user ids -- shared by
  // Communities/Challenges too for rendering member/participant lists.
  // Only succeeds for ids the caller has some relationship with (friend,
  // pending request, or shared community) per profiles' RLS -- anyone else
  // simply comes back missing from the map, which callers treat as "name
  // unavailable" rather than erroring.
  //
  // Deliberately does NOT also resolve photo signed URLs here -- an
  // earlier version did, but that made this a 3-step serial chain
  // (friend_requests/members -> profiles -> signed urls) that blocked the
  // ENTIRE page (names, buttons, everything) on a third mobile-network
  // round trip before any of it could render. Signed-url resolution is a
  // separate, non-blocking pass -- see App.Components.Avatar.renderList,
  // which callers run AFTER painting the list with this data.
  function profilesForUserIds(userIds) {
    const unique = Array.from(new Set(userIds));
    if (unique.length === 0) return Promise.resolve({});
    return db.from('profiles')
      .select('user_id, name, profile_picture_type, profile_picture_url, preset_avatar_id')
      .in('user_id', unique)
      .then(function (res) {
        const map = {};
        (res.data || []).forEach(function (row) { map[row.user_id] = profileRowToObj(row); });
        return map;
      });
  }

  function sendFriendRequest(userId, recipientUserId) {
    return db.from('friend_requests').insert({ sender_id: userId, recipient_id: recipientUserId }).then(function (res) {
      if (res.error) return { ok: false, error: res.error.message };
      return { ok: true };
    });
  }

  // accept=true accepts the request; accept=false covers decline AND
  // unfriend, both of which are just "remove this row" (see schema.sql).
  function respondToFriendRequest(requestId, accept) {
    if (accept) {
      return db.from('friend_requests')
        .update({ status: 'accepted', responded_at: new Date().toISOString() })
        .eq('id', requestId)
        .then(function (res) { return { ok: !res.error, error: res.error && res.error.message }; });
    }
    return db.from('friend_requests').delete().eq('id', requestId)
      .then(function (res) { return { ok: !res.error, error: res.error && res.error.message }; });
  }

  // Fetches every friend_requests row involving userId in one query, then
  // splits it into friends (accepted) / incoming (pending, I'm the
  // recipient) / outgoing (pending, I'm the sender), each entry carrying
  // the row id (needed to accept/decline/cancel/unfriend) and the OTHER
  // party's basic profile info.
  function getFriendData(userId) {
    return db.from('friend_requests')
      .select('*')
      .or('sender_id.eq.' + userId + ',recipient_id.eq.' + userId)
      .then(function (res) {
        if (res.error) {
          console.error('[Social] getFriendData failed:', res.error);
          return { friends: [], incoming: [], outgoing: [] };
        }
        const rows = res.data || [];
        const otherIds = rows.map(function (r) { return r.sender_id === userId ? r.recipient_id : r.sender_id; });
        return profilesForUserIds(otherIds).then(function (profileMap) {
          const friends = [], incoming = [], outgoing = [];
          rows.forEach(function (r) {
            const otherId = r.sender_id === userId ? r.recipient_id : r.sender_id;
            const entry = { requestId: r.id, userId: otherId, profile: profileMap[otherId] || null };
            if (r.status === 'accepted') friends.push(entry);
            else if (r.recipient_id === userId) incoming.push(entry);
            else outgoing.push(entry);
          });
          return { friends: friends, incoming: incoming, outgoing: outgoing };
        });
      });
  }

  return {
    findUserByPublicId, profilesForUserIds,
    sendFriendRequest, respondToFriendRequest,
    getFriendData,
  };
})();
