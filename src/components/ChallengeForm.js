window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Create-a-challenge form: type, target (kg amount for gain/loss, % of
 * bodyweight for strength), exercise picker (strength only), time window,
 * and race-vs-leaderboard mode with the exact descriptive copy requested.
 */
App.Components.ChallengeForm = (function () {
  const MODE_DESCRIPTIONS = {
    race: 'Race: first person to reach the target wins, challenge ends the moment someone hits it.',
    leaderboard: 'Leaderboard: everyone ranked at the end of the time window by how close they got or how much they achieved — no early winner.',
  };

  function render(container, opts) {
    const user = opts.user;
    let selectedType = 'gain';
    let selectedLift = App.Standards.CATEGORIES[0].lifts[0];
    let selectedMode = 'race';

    container.innerHTML =
      '<form class="challenge-form" novalidate>' +
        '<div class="field">' +
          '<label>Type</label>' +
          '<div class="goal-type-toggle challenge-type-toggle">' +
            '<button type="button" class="goal-type-btn goal-type-btn--active" data-type="gain">Weight Gain</button>' +
            '<button type="button" class="goal-type-btn" data-type="loss">Weight Loss</button>' +
            '<button type="button" class="goal-type-btn" data-type="strength">Strength</button>' +
          '</div>' +
        '</div>' +
        '<div class="field challenge-lift-field" hidden>' +
          '<label>Exercise</label>' +
          '<div id="chf-exercise-picker-slot"></div>' +
        '</div>' +
        '<div class="field">' +
          '<label id="chf-target-label" for="chf-target">Target (kg to gain)</label>' +
          '<input id="chf-target" type="number" min="0" step="0.5" />' +
        '</div>' +
        '<div class="field-row">' +
          '<div class="field"><label for="chf-start">Start date</label><input id="chf-start" type="date" /></div>' +
          '<div class="field"><label for="chf-end">End date</label><input id="chf-end" type="date" /></div>' +
        '</div>' +
        '<div class="field">' +
          '<label>Mode</label>' +
          '<div class="goal-type-toggle">' +
            '<button type="button" class="goal-type-btn goal-type-btn--active" data-mode="race">Race</button>' +
            '<button type="button" class="goal-type-btn" data-mode="leaderboard">Leaderboard</button>' +
          '</div>' +
          '<p class="field-hint" id="chf-mode-desc"></p>' +
        '</div>' +
        '<p class="field-error" id="chf-error"></p>' +
        '<button type="submit" class="btn-primary">Start challenge</button>' +
      '</form>';

    const els = {
      form: container.querySelector('.challenge-form'),
      liftField: container.querySelector('.challenge-lift-field'),
      targetLabel: container.querySelector('#chf-target-label'),
      target: container.querySelector('#chf-target'),
      start: container.querySelector('#chf-start'),
      end: container.querySelector('#chf-end'),
      modeDesc: container.querySelector('#chf-mode-desc'),
      error: container.querySelector('#chf-error'),
    };

    els.start.value = new Date().toISOString().slice(0, 10);
    const twoWeeksOut = new Date();
    twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);
    els.end.value = twoWeeksOut.toISOString().slice(0, 10);

    function updateTypeUi() {
      els.liftField.hidden = selectedType !== 'strength';
      els.targetLabel.textContent = selectedType === 'strength'
        ? 'Target (% of bodyweight)'
        : 'Target (kg to ' + (selectedType === 'gain' ? 'gain' : 'lose') + ')';
    }
    updateTypeUi();
    els.modeDesc.textContent = MODE_DESCRIPTIONS[selectedMode];

    App.Components.ExercisePicker.render(container.querySelector('#chf-exercise-picker-slot'), {
      id: 'chf-exercise-picker',
      value: selectedLift,
      userId: user.id,
      onChange: function (lift) { selectedLift = lift; },
    });

    container.querySelectorAll('[data-type]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedType = btn.dataset.type;
        container.querySelectorAll('[data-type]').forEach(function (b) { b.classList.toggle('goal-type-btn--active', b === btn); });
        updateTypeUi();
      });
    });

    container.querySelectorAll('[data-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedMode = btn.dataset.mode;
        container.querySelectorAll('[data-mode]').forEach(function (b) { b.classList.toggle('goal-type-btn--active', b === btn); });
        els.modeDesc.textContent = MODE_DESCRIPTIONS[selectedMode];
      });
    });

    els.form.addEventListener('submit', function (e) {
      e.preventDefault();
      els.error.textContent = '';
      const target = parseFloat(els.target.value);
      if (!(target > 0)) { els.error.textContent = 'Enter a target greater than 0.'; return; }
      if (!els.start.value || !els.end.value) { els.error.textContent = 'Pick a start and end date.'; return; }
      if (els.end.value < els.start.value) { els.error.textContent = 'End date must be on or after the start date.'; return; }

      const fields = {
        type: selectedType,
        lift: selectedType === 'strength' ? selectedLift : null,
        targetKg: selectedType !== 'strength' ? target : null,
        targetPercent: selectedType === 'strength' ? target : null,
        mode: selectedMode,
        startDate: els.start.value,
        endDate: els.end.value,
      };

      const submitBtn = els.form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      App.Challenges.createChallenge(user, opts.communityId, fields).then(function (res) {
        if (!res.ok) {
          els.error.textContent = res.error || 'Could not create challenge.';
          submitBtn.disabled = false;
          return;
        }
        opts.onCreated(res.challenge);
      });
    });
  }

  return { render };
})();
