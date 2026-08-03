window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Generic top-of-screen toast, shown for a few seconds then auto-dismissed
 * (or dismissed early on click). One at a time -- a new message replaces
 * whatever's currently showing and resets the timer, rather than stacking.
 * Shared by FriendRequestToast (friend requests + community invites) and
 * GymAutoComplete (workout auto-completion) -- anywhere a brief "something
 * just happened" notice is needed, independent of whatever page is open.
 */
App.Components.Toast = (function () {
  let toastEl = null;
  let hideTimer = null;

  function show(message, durationMs) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'app-toast';
      toastEl.addEventListener('click', hide);
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message; // textContent -- no HTML escaping needed/wanted here
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, durationMs || 5000);
  }

  function hide() {
    clearTimeout(hideTimer);
    if (toastEl) { toastEl.remove(); toastEl = null; }
  }

  return { show, hide };
})();
