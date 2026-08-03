window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Friend-request notifications: a live toast the instant a request arrives
 * while this session is open (Supabase Realtime -- see
 * App.Social.subscribeToFriendRequests, which needs friend_requests added
 * to the supabase_realtime publication, see schema.sql), plus a one-time
 * catch-up toast for anything that arrived while offline, shown once on
 * the next app open and then marked notified so it never repeats.
 *
 * init() is called once per session (app.js at boot if already logged in,
 * Auth.js right after a fresh login/signup) and stop() tears the
 * subscription down on logout (Navbar.js) -- this is intentionally a
 * session-lifetime singleton, not tied to any one page, since a friend
 * request should surface regardless of which page is currently open.
 */
App.Components.FriendRequestToast = (function () {
  let unsubscribe = null;
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

  function notifyForRows(user, rows) {
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

  function init(user) {
    stop();

    // Catch-up first: anything that arrived while offline, surfaced once.
    App.Social.getUnnotifiedIncomingRequests(user.id).then(function (rows) {
      notifyForRows(user, rows);
    });

    // Then live, for the rest of this session.
    unsubscribe = App.Social.subscribeToFriendRequests(user.id, function (row) {
      notifyForRows(user, [row]);
    });
  }

  function stop() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    hideToast();
  }

  return { init, stop };
})();
