window.App = window.App || {};

App.Router = (function () {
  const PROTECTED = ['home', 'one-rep-max', 'history', 'split-builder', 'achievements', 'settings', 'profile-setup', 'profile', 'community'];
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
    // Community/challenge pages are nested ("community/<id>",
    // "community/<id>/challenge/<id>", "community/join/<code>") -- every
    // protection/redirect check below only needs the base segment, so this
    // is the one place that splits it out.
    const routeBase = route.split('/')[0];
    const user = App.Auth.getCurrentUser();

    // The whole app is built on CSS custom properties, so a logged-in
    // user's custom theme (or the default) just needs to be re-applied on
    // every navigation -- covers initial load, login, logout, and
    // switching accounts in one place, no separate hook needed anywhere
    // else.
    App.Theme.applyTheme(user ? App.Storage.getTheme(user.id) : App.Theme.DEFAULTS);

    if (PROTECTED.indexOf(routeBase) !== -1 && !user) {
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

    // Mandatory first-time profile setup: gated on the explicit
    // setup_complete flag (set true only by ProfileSetup's onSave), not
    // inferred from any other field being present. Blocks every other
    // protected route (including Home) -- and therefore the "Take the
    // tour" button too, since that only lives on Home (see Home.js). Once
    // complete, the setup route itself redirects home instead of being
    // revisitable.
    if (user) {
      const profile = App.Storage.getProfile(user.id);
      const profileComplete = !!(profile && profile.setupComplete);
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
    } else if (route === 'profile') {
      App.Pages.Profile.render(rootEl, { user: user });
    } else if (routeBase === 'community') {
      const segments = route.split('/');
      if (segments[1] === 'join' && segments[2]) {
        App.Pages.Community.render(rootEl, { user: user, joinCode: segments[2] });
      } else if (segments[1] && segments[2] === 'challenge' && segments[3]) {
        App.Pages.ChallengeDetail.render(rootEl, { user: user, communityId: segments[1], challengeId: segments[3] });
      } else if (segments[1]) {
        App.Pages.CommunityDetail.render(rootEl, { user: user, communityId: segments[1] });
      } else {
        App.Pages.Community.render(rootEl, { user: user });
      }
    } else {
      App.Pages.Landing.render(rootEl, {});
    }

    window.scrollTo(0, 0);
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
