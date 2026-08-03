window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Social notifications: a live toast the instant a friend request or
 * community invite arrives while this session is open (Supabase Realtime
 * -- see App.Social.subscribeToFriendRequests / App.Communities.
 * subscribeToCommunityInvites, both of which need their table added to
 * the supabase_realtime publication, see schema.sql), plus a one-time
 * catch-up toast for anything that arrived while offline, shown once on
 * the next app open and then marked notified so it never repeats.
 *
 * init() is called once per session (app.js at boot if already logged in,
 * Auth.js right after a fresh login/signup) and stop() tears both
 * subscriptions down on logout (Navbar.js) -- this is intentionally a
 * session-lifetime singleton, not tied to any one page, since either kind
 * of notification should surface regardless of which page is open.
 */
App.Components.FriendRequestToast = (function () {
  let unsubscribeFriends = null;
  let unsubscribeInvites = null;
  let toastEl = null;
  let hideTimer = null;

  function nameFor(profile) {
    return profile && profile.name ? profile.name : 'Someone';
  }

  function showToast(message) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'friend-request-toast';
      toastEl.addEventListener('click', function () { hideToast(); });
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message; // textContent -- no HTML escaping needed/wanted here
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideToast, 5000);
  }

  function hideToast() {
    clearTimeout(hideTimer);
    if (toastEl) { toastEl.remove(); toastEl = null; }
  }

  function notifyForFriendRequests(user, rows) {
    if (!rows || rows.length === 0) return;
    const ids = rows.map(function (r) { return r.id; });
    const senderIds = rows.map(function (r) { return r.sender_id; });
    App.Social.profilesForUserIds(senderIds).then(function (profileMap) {
      const message = rows.length === 1
        ? nameFor(profileMap[rows[0].sender_id]) + ' has sent you a friend request'
        : rows.length + ' new friend requests';
      showToast(message);
      App.Components.FriendsBadge.refresh(user);
      App.Social.markRequestsNotified(ids);
    });
  }

  // rows can come from either the catch-up query (which embeds
  // communities(name) via PostgREST) or a Realtime INSERT payload (which
  // has no such embed) -- resolves the community name the slow way for
  // whichever rows don't already have it.
  function notifyForCommunityInvites(user, rows) {
    if (!rows || rows.length === 0) return;
    const ids = rows.map(function (r) { return r.id; });

    if (rows.length > 1) {
      showToast(rows.length + ' new community invites');
      App.Communities.markInvitesNotified(ids);
      return;
    }

    const row = rows[0];
    const communityNamePromise = row.communities
      ? Promise.resolve(row.communities.name)
      : App.Communities.getCommunity(row.community_id).then(function (c) { return c ? c.name : 'a community'; });

    Promise.all([communityNamePromise, App.Social.profilesForUserIds([row.invited_by])]).then(function (results) {
      const communityName = results[0];
      const profileMap = results[1];
      showToast(nameFor(profileMap[row.invited_by]) + ' invited you to join ' + communityName);
      App.Communities.markInvitesNotified(ids);
    });
  }

  function init(user) {
    stop();

    // Catch-up first: anything that arrived while offline, surfaced once.
    App.Social.getUnnotifiedIncomingRequests(user.id).then(function (rows) {
      notifyForFriendRequests(user, rows);
    });
    App.Communities.getUnnotifiedInvites(user.id).then(function (rows) {
      notifyForCommunityInvites(user, rows);
    });

    // Then live, for the rest of this session.
    unsubscribeFriends = App.Social.subscribeToFriendRequests(user.id, function (row) {
      notifyForFriendRequests(user, [row]);
    });
    unsubscribeInvites = App.Communities.subscribeToCommunityInvites(user.id, function (row) {
      notifyForCommunityInvites(user, [row]);
    });
  }

  function stop() {
    if (unsubscribeFriends) { unsubscribeFriends(); unsubscribeFriends = null; }
    if (unsubscribeInvites) { unsubscribeInvites(); unsubscribeInvites = null; }
    hideToast();
  }

  return { init, stop };
})();
