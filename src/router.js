window.App = window.App || {};

App.Router = (function () {
  const PROTECTED = ['home', 'one-rep-max', 'history', 'split-builder', 'achievements', 'settings', 'profile-setup'];
  let navEl, rootEl;
  let lastUser = null, lastRoute = null;

  function parseRoute() {
    return window.location.hash.replace(/^#\/?/, '') || '';
  }

  function navigate(route) {
    window.location.hash = '#/' + route;
  }

  function handleRouteChange() {
    const route = parseRoute();
    const user = App.Auth.getCurrentUser();

    // The whole app is built on CSS custom properties, so a logged-in
    // user's custom theme (or the default) just needs to be re-applied on
    // every navigation -- covers initial load, login, logout, and
    // switching accounts in one place, no separate hook needed anywhere
    // else.
    App.Theme.applyTheme(user ? App.Storage.getTheme(user.id) : App.Theme.DEFAULTS);

    if (PROTECTED.indexOf(route) !== -1 && !user) {
      navigate('login');
      return;
    }
    if ((route === 'login' || route === 'signup') && user) {
      navigate('home');
      return;
    }
    if (route === '' && user) {
      navigate('home');
      return;
    }

    // Self-heals any goal that's marked achieved but has no matching
    // archive record (e.g. one marked achieved before archiving existed) --
    // runs on every authenticated navigation so the achievements list and
    // nav link are never permanently stuck out of sync with the goal state.
    if (user) App.Goals.ensureArchived(user.id);

    // Mandatory first-time profile setup: `name` is the one field only this
    // flow ever sets, so its absence means the user has never completed it.
    // Blocks every other protected route (including Home) -- and therefore
    // blocks the onboarding tour too, since that only ever triggers on the
    // home route below. Once complete, the setup route itself redirects
    // home instead of being revisitable.
    if (user) {
      const profile = App.Storage.getProfile(user.id);
      const profileComplete = !!(profile && profile.name);
      if (!profileComplete && route !== 'profile-setup') {
        navigate('profile-setup');
        return;
      }
      if (profileComplete && route === 'profile-setup') {
        navigate('home');
        return;
      }
    }

    // Achievements only exists once there's something to show -- direct
    // navigation (typed URL, stale bookmark) before the first goal is
    // reached bounces to Home the same as the hidden nav link implies.
    if (route === 'achievements' && user && App.Storage.getAchievements(user.id).length === 0) {
      navigate('home');
      return;
    }

    lastUser = user;
    lastRoute = route;
    App.Components.Navbar.render(navEl, { user: user, activeRoute: route });

    rootEl.innerHTML = '';
    if (route === 'login') {
      App.Pages.Auth.render(rootEl, { mode: 'login' });
    } else if (route === 'signup') {
      App.Pages.Auth.render(rootEl, { mode: 'signup' });
    } else if (route === 'profile-setup') {
      App.Pages.ProfileSetup.render(rootEl, { user: user });
    } else if (route === 'home') {
      App.Pages.Home.render(rootEl, { user: user });
    } else if (route === 'one-rep-max') {
      App.Pages.OneRepMax.render(rootEl, { user: user });
    } else if (route === 'history') {
      App.Pages.History.render(rootEl, { user: user });
    } else if (route === 'split-builder') {
      App.Pages.SplitBuilder.render(rootEl, { user: user });
    } else if (route === 'achievements') {
      App.Pages.Achievements.render(rootEl, { user: user });
    } else if (route === 'settings') {
      App.Pages.Settings.render(rootEl, { user: user });
    } else {
      App.Pages.Landing.render(rootEl, {});
    }

    window.scrollTo(0, 0);

    // The tour always starts on Home (the default post-login page), and
    // only auto-plays the first time this user has ever reached it --
    // TourOverlay itself drives navigation onward from here, so this is
    // the only spot that needs to kick it off.
    if (route === 'home' && user && !App.Storage.getTourSeen(user.id) && !App.Components.TourOverlay.isActive()) {
      App.Components.TourOverlay.start(user, App.TourSteps, {
        onFinish: function (u) { App.Storage.setTourSeen(u.id); },
      });
    }
  }

  // Re-renders just the navbar against whatever route/user it last rendered
  // for, without a full page navigation -- lets an in-page action (like
  // reaching a goal) update the nav (e.g. the Achievements link appearing)
  // immediately instead of waiting for the next hashchange.
  function refreshNavbar() {
    if (!navEl) return;
    App.Components.Navbar.render(navEl, { user: lastUser, activeRoute: lastRoute });
  }

  function init(navContainer, rootContainer) {
    navEl = navContainer;
    rootEl = rootContainer;
    window.addEventListener('hashchange', handleRouteChange);
    handleRouteChange();
  }

  return { init, navigate, refreshNavbar, getRoute: parseRoute };
})();
