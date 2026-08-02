window.App = window.App || {};
App.Pages = App.Pages || {};

App.Pages.Achievements = (function () {
  function achievementTitle(a) {
    if (a.type === 'bodyweight') {
      return (a.direction === 'lose' ? 'Lost ' : 'Gained ') + a.amount + ' ' + a.unit;
    }
    return App.Standards.LIFT_LABELS[a.lift] + ': ' + Math.round(a.targetValue) + ' ' + a.unit;
  }

  function achievementDetail(a) {
    const arrow = a.startValue != null ? Math.round(a.startValue) + ' ' + a.unit + ' → ' : '';
    return arrow + Math.round(a.targetValue) + ' ' + a.unit + (a.type === 'exercise' ? ' 1RM' : ' bodyweight');
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function render(container, opts) {
    const user = opts.user;
    const achievements = App.Storage.getAchievements(user.id)
      .slice()
      .sort(function (a, b) { return new Date(b.achievedAt) - new Date(a.achievedAt); });

    const listHtml = achievements.length === 0
      ? '<div class="empty-state"><p class="empty-hint">No achievements yet — reach a goal on Home to earn your first medal.</p></div>'
      : '<ul class="achievements-list">' +
          achievements.map(function (a) {
            const tierLabel = App.Components.MedalIcon.TIER_LABELS[a.tier] || App.Components.MedalIcon.TIER_LABELS.novice;
            return (
              '<li class="achievement-item">' +
                '<div class="achievement-medal">' + App.Components.MedalIcon.render(a.tier) + '</div>' +
                '<div class="achievement-info">' +
                  '<p class="achievement-title">' + achievementTitle(a) + '</p>' +
                  '<p class="achievement-detail">' + achievementDetail(a) + '</p>' +
                  '<p class="achievement-date">' + formatDate(a.achievedAt) + '</p>' +
                '</div>' +
                '<p class="achievement-tier-label achievement-tier-label--' + a.tier + '">' + tierLabel + '</p>' +
              '</li>'
            );
          }).join('') +
        '</ul>';

    container.innerHTML =
      '<section class="page page-achievements">' +
        '<div class="page-header">' +
          '<div class="page-title-row"><h1 class="page-title">Achievements</h1><div id="achievements-streak-badge"></div></div>' +
        '</div>' +
        '<div class="card">' + listHtml + '</div>' +
      '</section>';

    App.Components.StreakBadge.render(container.querySelector('#achievements-streak-badge'), user);
  }

  return { render };
})();
