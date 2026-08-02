window.App = window.App || {};
App.Components = App.Components || {};

App.Components.StandardsGauge = (function () {
  const LEVEL_LABELS = {
    below_untrained: 'Below Untrained',
    untrained: 'Untrained',
    novice: 'Novice',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    elite: 'Elite',
  };
  const SHORT_LABELS = {
    untrained: 'Untr',
    novice: 'Nov',
    intermediate: 'Int',
    advanced: 'Adv',
    elite: 'Elite',
  };

  function render(container, state) {
    if (!state || !state.oneRmKg || !state.bodyweightKg) {
      container.innerHTML =
        '<div class="gauge-panel gauge-panel--empty">' +
          '<p class="empty-hint">Log a set with your bodyweight to see how it ranks against strength standards.</p>' +
        '</div>';
      return;
    }

    const Standards = App.Standards;
    const Units = App.Units;
    const lift = state.lift;
    const sex = state.sex;
    const displayUnit = state.displayUnit;

    const thresholdsKg = Standards.getThresholdsKg(lift, sex, state.bodyweightKg);
    const maxKg = thresholdsKg.elite * 1.15;
    const levelKey = Standards.rank(state.oneRmKg, thresholdsKg);

    const boundsKg = [0, thresholdsKg.untrained, thresholdsKg.novice, thresholdsKg.intermediate, thresholdsKg.advanced, maxKg];
    const segClasses = ['gauge-seg-1', 'gauge-seg-2', 'gauge-seg-3', 'gauge-seg-4', 'gauge-seg-5'];

    const segmentsHtml = Standards.LEVELS.map(function (level, i) {
      const widthPct = ((boundsKg[i + 1] - boundsKg[i]) / maxKg) * 100;
      const thresholdDisplay = Units.round(Units.convert(thresholdsKg[level], 'kg', displayUnit), 0);
      return (
        '<div class="gauge-seg ' + segClasses[i] + '" style="flex-basis:' + widthPct + '%" title="' + LEVEL_LABELS[level] + ': ' + thresholdDisplay + ' ' + displayUnit + '+">' +
          '<span class="gauge-seg-label">' + SHORT_LABELS[level] + '<br>' + thresholdDisplay + '</span>' +
        '</div>'
      );
    }).join('');

    const markerPct = Math.min((state.oneRmKg / maxKg) * 100, 100);
    const oneRmDisplay = Units.round(Units.convert(state.oneRmKg, 'kg', displayUnit), 0);

    container.innerHTML =
      '<div class="gauge-panel">' +
        '<p class="gauge-current">Current level: <strong>' + LEVEL_LABELS[levelKey] + '</strong></p>' +
        '<div class="gauge-track-wrap">' +
          '<div class="gauge-marker" style="left:' + markerPct + '%">' +
            '<span class="gauge-marker-value">' + oneRmDisplay + ' ' + displayUnit + '</span>' +
            '<span class="gauge-marker-flag" aria-hidden="true"></span>' +
          '</div>' +
          '<div class="gauge-track" role="img" aria-label="Estimated 1RM of ' + oneRmDisplay + ' ' + displayUnit + ' ranked as ' + LEVEL_LABELS[levelKey] + '">' +
            segmentsHtml +
          '</div>' +
        '</div>' +
        '<p class="gauge-disclaimer">Approximate reference standards — not a verified or official dataset.</p>' +
      '</div>';
  }

  return { render };
})();
