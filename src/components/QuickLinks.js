window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Shared quick-jump bar, fixed to the bottom of the viewport on every
 * protected page -- links to the OTHER pages (never the current one),
 * supplementing the hamburger menu rather than replacing it. One
 * config-driven component so the link set/order/unlock rule lives in
 * exactly one place instead of being copy-pasted across six pages.
 *
 * Icon-only buttons, but never icon-only for assistive tech: each link
 * carries both a native `title` (hover tooltip) and `aria-label` (screen
 * readers), so the destination is always confirmable even without visible
 * text.
 */
App.Components.QuickLinks = (function () {
  function gearIcon() {
    let teeth = '';
    for (let i = 0; i < 6; i++) {
      teeth += '<rect x="10.5" y="1.5" width="3" height="4" rx="1" fill="currentColor" transform="rotate(' + (i * 60) + ' 12 12)" />';
    }
    return (
      '<svg viewBox="0 0 24 24" class="page-quick-link-icon" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="2" />' +
        teeth +
        '<circle cx="12" cy="12" r="2" fill="currentColor" />' +
      '</svg>'
    );
  }

  const ICONS = {
    home:
      '<svg viewBox="0 0 24 24" class="page-quick-link-icon" aria-hidden="true">' +
        '<path d="M3 11l9-8 9 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />' +
        '<path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />' +
      '</svg>',
    dumbbell:
      '<svg viewBox="0 0 24 24" class="page-quick-link-icon" aria-hidden="true">' +
        '<path d="M2 10v4M4 7v10M20 7v10M22 10v4M6 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />' +
      '</svg>',
    clock:
      '<svg viewBox="0 0 24 24" class="page-quick-link-icon" aria-hidden="true">' +
        '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />' +
        '<path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />' +
      '</svg>',
    calendar:
      '<svg viewBox="0 0 24 24" class="page-quick-link-icon" aria-hidden="true">' +
        '<rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2" />' +
        '<path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />' +
      '</svg>',
    trophy:
      '<svg viewBox="0 0 24 24" class="page-quick-link-icon" aria-hidden="true">' +
        '<path d="M8 4h8v4a4 4 0 0 1-8 0V4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />' +
        '<path d="M8 5H5a1 1 0 0 0-1 1v1a4 4 0 0 0 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />' +
        '<path d="M16 5h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />' +
        '<line x1="12" y1="12" x2="12" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />' +
        '<line x1="8" y1="21" x2="16" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />' +
      '</svg>',
    gear: gearIcon(),
  };

  const PAGES = [
    { route: 'home', href: '#/home', label: 'Home', icon: 'home' },
    { route: 'one-rep-max', href: '#/one-rep-max', label: '1 Rep Max', icon: 'dumbbell' },
    { route: 'history', href: '#/history', label: 'History', icon: 'clock' },
    { route: 'split-builder', href: '#/split-builder', label: 'Build My Split', icon: 'calendar' },
    { route: 'achievements', href: '#/achievements', label: 'Achievements', icon: 'trophy' },
    { route: 'settings', href: '#/settings', label: 'Settings', icon: 'gear' },
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
          return (
            '<a href="' + p.href + '" class="page-quick-link" title="' + p.label + '" aria-label="' + p.label + '">' +
              ICONS[p.icon] +
            '</a>'
          );
        }).join('') +
      '</div>';
  }

  return { render };
})();
