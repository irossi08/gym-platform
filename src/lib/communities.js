window.App = window.App || {};

/**
 * Communities: create/browse/join/leave, plus member listing. Same async,
 * not-preloaded pattern as App.Social -- membership can change from other
 * people's actions at any time, so pages fetch fresh rather than reading a
 * boot-time cache.
 */
App.Communities = (function () {
  const db = App.Supabase;

  function communityRowToObj(row) {
    return {
      id: row.id, name: row.name, visibility: row.visibility,
      inviteCode: row.invite_code, createdBy: row.created_by, createdAt: row.created_at,
    };
  }

  function inviteLink(inviteCode) {
    return window.location.origin + window.location.pathname + '#/community/join/' + inviteCode;
  }

  // Creates the community, then adds the creator as its first member --
  // the community_members insert policy explicitly allows this regardless
  // of visibility (see schema.sql), so a private community's creator still
  // lands inside it immediately.
  function createCommunity(userId, fields) {
    return db.from('communities').insert({
      name: fields.name, visibility: fields.visibility, created_by: userId,
    }).select().single().then(function (res) {
      if (res.error) return { ok: false, error: res.error.message };
      const community = communityRowToObj(res.data);
      return db.from('community_members').insert({ community_id: community.id, user_id: userId }).then(function (memberRes) {
        if (memberRes.error) return { ok: false, error: memberRes.error.message };
        return { ok: true, community: community };
      });
    });
  }

  function getCommunity(communityId) {
    return db.from('communities').select('*').eq('id', communityId).maybeSingle().then(function (res) {
      if (res.error || !res.data) return null;
      return communityRowToObj(res.data);
    });
  }

  function getMyCommunities(userId) {
    return db.from('community_members')
      .select('joined_at, communities(*)')
      .eq('user_id', userId)
      .then(function (res) {
        if (res.error) {
          console.error('[Communities] getMyCommunities failed:', res.error);
          return [];
        }
        return (res.data || [])
          .filter(function (row) { return row.communities; })
          .map(function (row) { return Object.assign({ joinedAt: row.joined_at }, communityRowToObj(row.communities)); });
      });
  }

  // Capped at 30 results -- this is a search-driven list, not a full
  // directory dump, so there's no need to ever fetch every public
  // community up front.
  function browsePublicCommunities(search) {
    let query = db.from('communities').select('*').eq('visibility', 'public');
    if (search) query = query.ilike('name', '%' + search + '%');
    return query.order('created_at', { ascending: false }).limit(30).then(function (res) {
      if (res.error) {
        console.error('[Communities] browsePublicCommunities failed:', res.error);
        return [];
      }
      return (res.data || []).map(communityRowToObj);
    });
  }

  function joinPublicCommunity(userId, communityId) {
    return db.from('community_members').insert({ community_id: communityId, user_id: userId }).then(function (res) {
      // Postgres unique_violation -- already a member, treat as success.
      if (res.error && res.error.code !== '23505') return { ok: false, error: res.error.message };
      return { ok: true };
    });
  }

  function joinByCode(inviteCode) {
    return db.rpc('join_community_by_code', { p_invite_code: inviteCode }).then(function (res) {
      if (res.error) return { ok: false, error: res.error.message };
      const row = res.data && res.data[0];
      return row ? { ok: true, community: communityRowToObj(row) } : { ok: false, error: 'Invalid invite code.' };
    });
  }

  function leaveCommunity(userId, communityId) {
    return db.from('community_members').delete().eq('community_id', communityId).eq('user_id', userId)
      .then(function (res) { return { ok: !res.error, error: res.error && res.error.message }; });
  }

  function getMembers(communityId) {
    return db.from('community_members').select('user_id, joined_at').eq('community_id', communityId).then(function (res) {
      if (res.error) {
        console.error('[Communities] getMembers failed:', res.error);
        return [];
      }
      const rows = res.data || [];
      return App.Social.profilesForUserIds(rows.map(function (r) { return r.user_id; })).then(function (profileMap) {
        return rows.map(function (r) { return { userId: r.user_id, joinedAt: r.joined_at, profile: profileMap[r.user_id] || null }; });
      });
    });
  }

  // For the "invite a friend to a community" flow -- deliberately just the
  // ones this user created, not every community they belong to, matching
  // the request that this be an owner-only action.
  function getMyCreatedCommunities(userId) {
    return db.from('communities').select('*').eq('created_by', userId).order('created_at', { ascending: false }).then(function (res) {
      if (res.error) {
        console.error('[Communities] getMyCreatedCommunities failed:', res.error);
        return [];
      }
      return (res.data || []).map(communityRowToObj);
    });
  }

  // Sends an invite requiring acceptance -- same philosophy as friend
  // requests and challenge invites, NOT a direct add. Only the community's
  // creator can send one, and only to an actual friend (both enforced by
  // community_invites_insert in schema.sql).
  function inviteFriendToCommunity(communityId, friendUserId, inviterUserId) {
    return db.from('community_invites').insert({
      community_id: communityId, invited_by: inviterUserId, invited_user_id: friendUserId,
    }).then(function (res) {
      // Postgres unique_violation -- already invited (and still pending).
      if (res.error) return { ok: false, error: res.error.code === '23505' ? 'Already invited.' : res.error.message };
      return { ok: true };
    });
  }

  function communityInviteRowToObj(row) {
    return {
      id: row.id, communityId: row.community_id, invitedBy: row.invited_by,
      communityName: row.communities ? row.communities.name : 'Unknown community',
      createdAt: row.created_at,
    };
  }

  // Pending invites addressed to userId, with the inviter's name/avatar
  // and the community's name attached for display.
  function getMyPendingInvites(userId) {
    return db.from('community_invites')
      .select('*, communities(name)')
      .eq('invited_user_id', userId)
      .eq('status', 'pending')
      .then(function (res) {
        if (res.error) {
          console.error('[Communities] getMyPendingInvites failed:', res.error);
          return [];
        }
        const rows = (res.data || []).map(communityInviteRowToObj);
        return App.Social.profilesForUserIds(rows.map(function (r) { return r.invitedBy; })).then(function (profileMap) {
          rows.forEach(function (r) { r.inviterProfile = profileMap[r.invitedBy] || null; });
          return rows;
        });
      });
  }

  // Atomic accept-and-join -- see accept_community_invite() in schema.sql.
  function acceptCommunityInvite(inviteId) {
    return db.rpc('accept_community_invite', { p_invite_id: inviteId }).then(function (res) {
      return { ok: !res.error, error: res.error && res.error.message };
    });
  }

  function declineCommunityInvite(inviteId) {
    return db.from('community_invites').delete().eq('id', inviteId)
      .then(function (res) { return { ok: !res.error, error: res.error && res.error.message }; });
  }

  // Catch-up/notified tracking, same pattern as the friend_requests
  // equivalents in App.Social -- see FriendRequestToast. Returns RAW rows
  // (not communityInviteRowToObj) deliberately, same shape as a Realtime
  // INSERT payload (which has no communities(name) embed -- that's a
  // PostgREST-only feature) -- FriendRequestToast handles both sources
  // through one code path this way.
  function getUnnotifiedInvites(userId) {
    return db.from('community_invites')
      .select('*, communities(name)')
      .eq('invited_user_id', userId)
      .eq('status', 'pending')
      .eq('notified', false)
      .then(function (res) {
        if (res.error) {
          console.error('[Communities] getUnnotifiedInvites failed:', res.error);
          return [];
        }
        return res.data || [];
      });
  }

  function markInvitesNotified(inviteIds) {
    if (!inviteIds || inviteIds.length === 0) return Promise.resolve();
    return db.from('community_invites').update({ notified: true }).in('id', inviteIds)
      .then(function (res) { if (res.error) console.error('[Communities] markInvitesNotified failed:', res.error); });
  }

  // Live: fires onInsert(row) the instant a new community_invites row
  // targeting userId is inserted -- requires community_invites to be part
  // of the supabase_realtime publication (see schema.sql).
  function subscribeToCommunityInvites(userId, onInsert) {
    const channel = db
      .channel('community-invites-' + userId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'community_invites', filter: 'invited_user_id=eq.' + userId,
      }, function (payload) { onInsert(payload.new); })
      .subscribe();
    return function unsubscribe() { db.removeChannel(channel); };
  }

  return {
    inviteLink, createCommunity, getCommunity, getMyCommunities,
    browsePublicCommunities, joinPublicCommunity, joinByCode, leaveCommunity, getMembers,
    getMyCreatedCommunities, inviteFriendToCommunity,
    getMyPendingInvites, acceptCommunityInvite, declineCommunityInvite,
    getUnnotifiedInvites, markInvitesNotified, subscribeToCommunityInvites,
  };
})();
