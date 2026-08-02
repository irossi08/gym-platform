window.App = window.App || {};
App.Components = App.Components || {};

App.Components.ResultPanel = (function () {
  function render(container, state) {
    if (!state || !state.result) {
      container.innerHTML =
        '<div class="result-panel result-panel--empty">' +
          '<p class="empty-hint">Log a set above to see your estimated 1RM.</p>' +
        '</div>';
      return;
    }

    const r = state.result;
    const unit = state.unit;
    const avg = App.Units.round(r.average, 0);
    const e = App.Units.round(r.epley, 0);
    const b = App.Units.round(r.brzycki, 0);
    const l = App.Units.round(r.lombardi, 0);

    let warningHtml = '';
    if (r.unreliable) {
      warningHtml =
        '<div class="banner banner--warning">' +
          '<span class="banner-icon" aria-hidden="true">&#9888;</span>' +
          '<span>Above ~12 reps, 1RM formulas get unreliable — treat this estimate loosely.</span>' +
        '</div>';
    }

    container.innerHTML =
      '<div class="result-panel">' +
        warningHtml +
        '<p class="result-label">Estimated 1-rep max</p>' +
        '<p class="result-hero">' + avg + '<span class="result-unit">' + unit + '</span></p>' +
        '<div class="result-breakdown">' +
          '<div><span class="breakdown-label">Epley</span><span class="breakdown-value">' + e + ' ' + unit + '</span></div>' +
          '<div><span class="breakdown-label">Brzycki</span><span class="breakdown-value">' + b + ' ' + unit + '</span></div>' +
          '<div><span class="breakdown-label">Lombardi</span><span class="breakdown-value">' + l + ' ' + unit + '</span></div>' +
        '</div>' +
      '</div>';
  }

  return { render };
})();
