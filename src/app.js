(function () {
  async function init() {
    const navEl = document.getElementById('navbar-root');
    const rootEl = document.getElementById('app-root');

    // A brief network round-trip happens here on every page load (restoring
    // the session, then warming the data cache for it) before there's
    // anything to route to -- show a small loading state rather than a
    // blank page for that gap.
    rootEl.innerHTML = '<p class="app-boot-hint">Loading…</p>';

    await App.Auth.ready();
    const user = App.Auth.getCurrentUser();
    if (user) {
      await App.Storage.preloadAll(user.id);
      App.Components.FriendRequestToast.init(user);
    }

    App.Router.init(navEl, rootEl);
  }
  document.addEventListener('DOMContentLoaded', init);
})();
