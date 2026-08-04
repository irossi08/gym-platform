window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Shows the calculated estimate for a logged set as a TARGET to attempt,
 * not an automatic PB -- confirming it is a separate, explicit step
 * (App.Pages.OneRepMax owns the state; this just renders whichever phase
 * it's in and wires the buttons back to onAttempt/onConfirm):
 *
 *   idle       -- "Attempt this weight" button
 *   confirming -- "Did you hit it?" with Success/Fail
 *   succeeded  -- confirmed-hit status, plus the congratulatory message
 *                 ONLY right after confirming (state.justConfirmed) --
 *                 re-rendering the same already-confirmed entry later
 *                 (a unit toggle, a page reload) shows the quiet status
 *                 only, not the celebration again
 *   failed     -- confirmed-miss status, same justConfirmed-gated message
 */
App.Components.ResultPanel = (function () {
  function attemptSectionHtml(state) {
    const phase = state.attemptPhase || 'idle';

    if (phase === 'confirming') {
      return (
        '<div class="attempt-section attempt-confirm">' +
          '<p class="attempt-confirm-question">Did you hit it?</p>' +
          '<div class="attempt-confirm-actions">' +
            '<button type="button" class="btn-primary attempt-confirm-btn" data-success="true">Success</button>' +
            '<button type="button" class="btn-ghost-sm attempt-confirm-btn" data-success="false">Fail</button>' +
          '</div>' +
        '</div>'
      );
    }

    if (phase === 'succeeded') {
      const message = !state.justConfirmed ? '' : (
        state.isNewPb
          ? '<p class="attempt-message attempt-message--success">🎉 New PB! You hit it — the progress doesn’t stop there, keep pushing.</p>'
          : '<p class="attempt-message attempt-message--success">🎉 You hit it! Keep pushing to beat your current best.</p>'
      );
      return (
        '<div class="attempt-section">' +
          '<p class="attempt-status attempt-status--success">&#10003; Confirmed hit</p>' +
          message +
        '</div>'
      );
    }

    if (phase === 'failed') {
      const message = !state.justConfirmed ? '' :
        '<p class="attempt-message attempt-message--fail">Sorry to hear that — rest up and come back stronger next time.</p>';
      return (
        '<div class="attempt-section">' +
          '<p class="attempt-status attempt-status--fail">&#10007; Not hit this time</p>' +
          message +
        '</div>'
      );
    }

    return (
      '<div class="attempt-section">' +
        '<button type="button" class="btn-primary attempt-btn">Attempt this weight</button>' +
      '</div>'
    );
  }

  function render(container, state) {
    if (!state || !state.result) {
      container.innerHTML =
        '<div class="result-panel result-panel--empty">' +
          '<p class="empty-hint">Log a set above to see your target 1RM.</p>' +
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
        '<p class="result-label">Target 1-rep max</p>' +
        '<p class="result-hero">' + avg + '<span class="result-unit">' + unit + '</span></p>' +
        '<p class="result-sublabel">An estimate to attempt — not an automatic PB until you confirm you hit it.</p>' +
        '<div class="result-breakdown">' +
          '<div><span class="breakdown-label">Epley</span><span class="breakdown-value">' + e + ' ' + unit + '</span></div>' +
          '<div><span class="breakdown-label">Brzycki</span><span class="breakdown-value">' + b + ' ' + unit + '</span></div>' +
          '<div><span class="breakdown-label">Lombardi</span><span class="breakdown-value">' + l + ' ' + unit + '</span></div>' +
        '</div>' +
        attemptSectionHtml(state) +
      '</div>';

    const attemptBtn = container.querySelector('.attempt-btn');
    if (attemptBtn && state.onAttempt) {
      attemptBtn.addEventListener('click', state.onAttempt);
    }

    container.querySelectorAll('.attempt-confirm-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (state.onConfirm) state.onConfirm(btn.dataset.success === 'true');
      });
    });
  }

  return { render };
})();
