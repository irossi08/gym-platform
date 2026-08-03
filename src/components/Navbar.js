window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Logged-in nav: a hamburger in the top-left opens a dropdown of page
 * links instead of a permanent link row. Desktop reveals it on :hover
 * (pure CSS, so it opens/closes smoothly with the pointer with no JS
 * involved); touch devices have no real hover state, so a click/tap also
 * toggles a `--open` class that forces it visible, and a single
 * document-level click listener (wired once, not re-added per render)
 * closes it on an outside tap. Logged-out state (Login/Get Started) is
 * unchanged -- those are auth actions, not page navigation, so they stay
 * as plain links.
 */
App.Components.Navbar = (function () {
  let outsideClickWired = false;

  function link(href, label, route, activeRoute, extraClass) {
    // Community has nested sub-routes ("community/<id>", ".../challenge/<id>")
    // -- comparing base segments keeps the Community link highlighted
    // anywhere under it, not just on the bare hub page.
    const isActive = route === (activeRoute || '').split('/')[0];
    const active = isActive ? ' navbar-link--active' : '';
    return '<a href="' + href + '" class="navbar-link' + active + (extraClass ? ' ' + extraClass : '') + '"' +
      (isActive ? ' aria-current="page"' : '') + '>' + label + '</a>';
  }

  function closeMenu() {
    const wrap = document.querySelector('.navbar-menu-wrap');
    const btn = document.querySelector('.navbar-hamburger');
    if (wrap) wrap.classList.remove('navbar-menu-wrap--open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function wireOutsideClickOnce() {
    if (outsideClickWired) return;
    outsideClickWired = true;
    document.addEventListener('click', function (e) {
      const wrap = document.querySelector('.navbar-menu-wrap');
      if (wrap && wrap.classList.contains('navbar-menu-wrap--open') && !wrap.contains(e.target)) {
        closeMenu();
      }
    });
  }

  function render(container, state) {
    const user = state.user;
    const activeRoute = state.activeRoute;

    let bodyHtml;
    if (user) {
      // Hidden entirely until the first goal is reached -- there's nothing
      // to show there before that, so no point advertising an empty page.
      const hasAchievements = App.Storage.getAchievements(user.id).length > 0;
      const pageLinksHtml =
        link('#/home', 'Home', 'home', activeRoute) +
        link('#/one-rep-max', '1 Rep Max', 'one-rep-max', activeRoute) +
        link('#/history', 'History', 'history', activeRoute) +
        link('#/split-builder', 'Build My Split', 'split-builder', activeRoute) +
        link('#/community', 'Community', 'community', activeRoute) +
        (hasAchievements ? link('#/achievements', 'Achievements', 'achievements', activeRoute) : '');

      const menuHtml =
        pageLinksHtml +
        '<div class="navbar-menu-divider"></div>' +
        link('#/settings', 'Settings', 'settings', activeRoute) +
        '<button type="button" class="navbar-link navbar-menu-logout" id="navbar-logout">Log out</button>';

      bodyHtml =
        '<div class="navbar-left">' +
          '<div class="navbar-menu-wrap">' +
            '<button type="button" class="navbar-hamburger" aria-haspopup="true" aria-expanded="false" aria-label="Menu">' +
              '<span class="navbar-hamburger-line"></span>' +
              '<span class="navbar-hamburger-line"></span>' +
              '<span class="navbar-hamburger-line"></span>' +
            '</button>' +
            '<div class="navbar-menu" role="menu"><div class="navbar-menu-inner">' + menuHtml + '</div></div>' +
          '</div>' +
          '<a href="#/" class="navbar-brand">CRIMSON<span class="navbar-brand-accent">REP</span></a>' +
        '</div>' +
        '<div class="navbar-right">' +
          '<span class="navbar-user">' + escapeHtml(user.username) + '</span>' +
        '</div>';
    } else {
      bodyHtml =
        '<a href="#/" class="navbar-brand">CRIMSON<span class="navbar-brand-accent">REP</span></a>' +
        '<div class="navbar-links">' +
          link('#/login', 'Log in', 'login', activeRoute) +
          link('#/signup', 'Get Started', 'signup', activeRoute, 'btn-accent-sm') +
        '</div>';
    }

    container.innerHTML = '<nav class="navbar">' + bodyHtml + '</nav>';

    const logoutBtn = container.querySelector('#navbar-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        App.Components.FriendRequestToast.stop();
        App.Components.GymAutoComplete.stop();
        App.Auth.logout();
        window.location.hash = '#/';
      });
    }

    const hamburgerBtn = container.querySelector('.navbar-hamburger');
    if (hamburgerBtn) {
      const menuWrap = container.querySelector('.navbar-menu-wrap');
      hamburgerBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        const isOpen = menuWrap.classList.toggle('navbar-menu-wrap--open');
        hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
      });
      menuWrap.querySelectorAll('.navbar-link').forEach(function (a) {
        a.addEventListener('click', closeMenu);
      });
      wireOutsideClickOnce();
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { render };
})();
