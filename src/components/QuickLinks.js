window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Shared quick-jump row shown under every protected page's own heading --
 * links to the OTHER pages (never the current one), supplementing the
 * hamburger menu rather than replacing it. One config-driven component so
 * the link set/order/unlock rule lives in exactly one place instead of
 * being copy-pasted across five pages.
 */
App.Components.QuickLinks = (function () {
  const PAGES = [
    { route: 'home', href: '#/home', label: 'Home' },
    { route: 'one-rep-max', href: '#/one-rep-max', label: '1 Rep Max' },
    { route: 'history', href: '#/history', label: 'History' },
    { route: 'split-builder', href: '#/split-builder', label: 'Build My Split' },
    { route: 'achievements', href: '#/achievements', label: 'Achievements' },
    { route: 'settings', href: '#/settings', label: 'Settings' },
  ];

  function render(container, user, currentRoute) {
    // Same unlock condition as the hamburger menu's Achievements link --
    // hidden entirely until there's something to show there.
    const hasAchievements = App.Storage.getAchievements(user.id).length > 0;

    const links = PAGES.filter(function (p) {
      if (p.route === currentRoute) return false;
      if (p.route === 'achievements' && !hasAchievements) return false;
      return true;
    });

    container.innerHTML =
      '<div class="page-quick-links">' +
        links.map(function (p) {
          return '<a href="' + p.href + '" class="page-quick-link">' + p.label + '</a>';
        }).join('') +
      '</div>';
  }

  return { render };
})();
