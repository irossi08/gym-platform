window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Small red pending-count badge on Home's Friends icon (#home-friends-btn).
 * Deliberately reads/writes the DOM directly rather than going through a
 * pub/sub system -- this app has no global event bus, and the badge only
 * ever needs updating from a handful of known call sites: Home's own
 * render, FriendsPanel after an accept/decline, and
 * FriendRequestToast after a new request arrives (live or catch-up).
 * A no-op wherever #home-friends-btn isn't currently on screen (any page
 * other than Home).
 */
App.Components.FriendsBadge = (function () {
  function setCount(n) {
    const btn = document.getElementById('home-friends-btn');
    if (!btn) return;
    let badge = btn.querySelector('.home-friends-badge');
    if (n > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'home-friends-badge';
        btn.appendChild(badge);
      }
      badge.textContent = n > 9 ? '9+' : String(n);
    } else if (badge) {
      badge.remove();
    }
  }

  function refresh(user) {
    return App.Social.getFriendData(user.id).then(function (fd) {
      setCount(fd.incoming.length);
      return fd.incoming.length;
    });
  }

  return { setCount, refresh };
})();
