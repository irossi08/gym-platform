window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Compact "seedling + streak number" badge shown next to the heading on
 * every protected page (Home, 1 Rep Max, History, Build My Split) -- this
 * is the only inline streak display in the app. Clicking it opens
 * StreakModal, a full-size overlay, rather than navigating anywhere.
 */
App.Components.StreakBadge = (function () {
  function render(container, user) {
    const split = App.Storage.getSplit(user.id);
    const streak = App.Schedule.recalculateStreak(user.id, split);
    const n = streak.count || 0;
    container.innerHTML =
      '<button type="button" class="streak-badge" aria-label="' + n + ' day streak — view details">' +
        App.Components.StreakIcon.render(n) +
        '<span class="streak-badge-count">' + n + '</span>' +
      '</button>';
    container.querySelector('.streak-badge').addEventListener('click', function () {
      App.Components.StreakModal.open(user);
    });
  }

  return { render };
})();
