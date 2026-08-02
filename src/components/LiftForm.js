window.App = window.App || {};
App.Components = App.Components || {};

App.Components.LiftForm = (function () {
  function render(container, opts) {
    const defaults = opts.defaults || {};
    const onSubmit = opts.onSubmit;
    const onLiftChange = opts.onLiftChange;
    const userId = opts.userId;
    const defaultLift = defaults.lift || 'squat';

    container.innerHTML =
      '<form class="lift-form" novalidate>' +
        '<h2 class="section-title">Log a set</h2>' +
        '<div class="field">' +
          '<label for="f-lift">Exercise</label>' +
          '<div id="f-lift-slot"></div>' +
        '</div>' +
        '<div class="field-row">' +
          '<div class="field">' +
            '<label for="f-weight" id="f-weight-label">Weight lifted</label>' +
            '<input id="f-weight" name="weight" type="number" inputmode="decimal" step="0.5" min="0" placeholder="e.g. 100" />' +
            '<p class="field-hint" id="f-weight-hint" hidden>For pull-ups/dips: your bodyweight is added automatically. Enter 0 here if you did bodyweight-only reps.</p>' +
            '<p class="field-error" id="f-weight-error" aria-live="polite"></p>' +
          '</div>' +
          '<div class="field field-narrow">' +
            '<label for="f-unit">Unit</label>' +
            '<select id="f-unit" name="unit">' +
              '<option value="kg"' + (defaults.unit === 'lb' ? '' : ' selected') + '>kg</option>' +
              '<option value="lb"' + (defaults.unit === 'lb' ? ' selected' : '') + '>lb</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div class="field">' +
          '<label for="f-reps">Reps</label>' +
          '<input id="f-reps" name="reps" type="number" inputmode="numeric" step="1" min="1" placeholder="e.g. 5" />' +
          '<p class="field-error" id="f-reps-error" aria-live="polite"></p>' +
          '<p class="field-warning" id="f-reps-warning" aria-live="polite" hidden>Above ~12 reps, 1RM formulas get unreliable — treat this estimate loosely.</p>' +
        '</div>' +
        '<div class="field-row">' +
          '<div class="field">' +
            '<label for="f-bodyweight">Bodyweight</label>' +
            '<input id="f-bodyweight" name="bodyweight" type="number" inputmode="decimal" step="0.5" min="0" placeholder="for standards" />' +
            '<p class="field-error" id="f-bodyweight-error" aria-live="polite"></p>' +
          '</div>' +
          '<div class="field field-narrow">' +
            '<label for="f-sex">Sex</label>' +
            '<select id="f-sex" name="sex">' +
              '<option value="male"' + (defaults.sex === 'female' ? '' : ' selected') + '>Male</option>' +
              '<option value="female"' + (defaults.sex === 'female' ? ' selected' : '') + '>Female</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<button type="submit" class="btn-primary">Calculate 1RM</button>' +
      '</form>';

    const form = container.querySelector('.lift-form');
    const weightInput = form.querySelector('#f-weight');
    const weightLabel = form.querySelector('#f-weight-label');
    const weightHint = form.querySelector('#f-weight-hint');
    const repsInput = form.querySelector('#f-reps');
    const bodyweightInput = form.querySelector('#f-bodyweight');
    const repsWarning = form.querySelector('#f-reps-warning');

    if (defaults.weight != null) weightInput.value = defaults.weight;
    if (defaults.reps != null) repsInput.value = defaults.reps;
    if (defaults.bodyweight != null) bodyweightInput.value = defaults.bodyweight;

    let currentLift = defaultLift;

    function updateWeightFieldForLift() {
      const isBw = App.ExerciseLibrary.isBodyweightLift(currentLift);
      weightLabel.textContent = isBw ? 'Added weight' : 'Weight lifted';
      weightHint.hidden = !isBw;
      weightInput.placeholder = isBw ? 'e.g. 20 (0 for bodyweight only)' : 'e.g. 100';
      if (onLiftChange) onLiftChange(currentLift);
    }

    App.Components.ExercisePicker.render(form.querySelector('#f-lift-slot'), {
      id: 'f-lift',
      value: currentLift,
      userId: userId,
      onChange: function (newLift) {
        currentLift = newLift;
        updateWeightFieldForLift();
      },
    });
    updateWeightFieldForLift();

    function setError(id, message) {
      form.querySelector('#' + id).textContent = message || '';
    }

    repsInput.addEventListener('input', function () {
      const reps = parseFloat(repsInput.value);
      repsWarning.hidden = !(reps > App.OneRepMax.RELIABLE_REPS_LIMIT && reps < 37);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      setError('f-weight-error', '');
      setError('f-reps-error', '');
      setError('f-bodyweight-error', '');

      const lift = currentLift;
      const unit = form.querySelector('#f-unit').value;
      const sex = form.querySelector('#f-sex').value;
      const isBw = App.ExerciseLibrary.isBodyweightLift(lift);
      const enteredWeight = parseFloat(weightInput.value);
      const reps = parseInt(repsInput.value, 10);
      const bodyweight = parseFloat(bodyweightInput.value);

      let hasError = false;
      if (isBw ? !(enteredWeight >= 0) : !(enteredWeight > 0)) {
        setError('f-weight-error', isBw ? 'Enter 0 or more for added weight.' : 'Enter a weight greater than 0.');
        hasError = true;
      }
      if (!(reps >= 1)) {
        setError('f-reps-error', 'Enter at least 1 rep.');
        hasError = true;
      } else if (reps >= 37) {
        setError('f-reps-error', 'Enter 36 or fewer reps — the formulas break down beyond this.');
        hasError = true;
      }
      if (!(bodyweight > 0)) {
        setError('f-bodyweight-error', 'Enter your bodyweight to compare against strength standards.');
        hasError = true;
      }
      if (hasError) return;

      const totalWeight = isBw ? bodyweight + enteredWeight : enteredWeight;

      onSubmit({
        lift, unit, sex, reps, bodyweight,
        weight: totalWeight,
        addedWeight: isBw ? enteredWeight : null,
      });

      weightInput.value = '';
      repsInput.value = '';
      repsWarning.hidden = true;
      weightInput.focus();
    });
  }

  return { render };
})();
