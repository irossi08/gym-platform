window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Full-size seedling illustration + streak count, opened from the compact
 * StreakBadge as a dismissible overlay -- the large form doesn't live on
 * any page, it only ever appears here. Appended to document.body (not the
 * page's own container) so it stays put over whatever page is showing;
 * closes itself on outside click, its own close button, a hashchange
 * (navigating away), or Escape.
 */
App.Components.StreakModal = (function () {
  let overlayEl = null;

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  function close() {
    if (!overlayEl) return;
    overlayEl.remove();
    overlayEl = null;
    window.removeEventListener('hashchange', close);
    document.removeEventListener('keydown', onKeydown);
  }

  function open(user) {
    close(); // guard against a stray double-open leaving two overlays

    const split = App.Storage.getSplit(user.id);
    const streak = App.Schedule.recalculateStreak(user.id, split);
    const n = streak.count || 0;

    overlayEl = document.createElement('div');
    overlayEl.className = 'streak-modal-overlay';
    overlayEl.innerHTML =
      '<div class="streak-modal" role="dialog" aria-modal="true" aria-label="Streak">' +
        '<button type="button" class="streak-modal-close" aria-label="Close">&times;</button>' +
        App.Components.StreakIcon.render(n) +
        '<p class="streak-modal-count">' + n + '</p>' +
        '<p class="streak-modal-label">day streak</p>' +
      '</div>';

    overlayEl.addEventListener('click', function (e) {
      if (e.target === overlayEl) close();
    });
    overlayEl.querySelector('.streak-modal-close').addEventListener('click', close);

    document.body.appendChild(overlayEl);
    window.addEventListener('hashchange', close);
    document.addEventListener('keydown', onKeydown);
  }

  return { open, close };
})();
