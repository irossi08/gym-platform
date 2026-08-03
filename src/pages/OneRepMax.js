window.App = window.App || {};
App.Pages = App.Pages || {};

App.Pages.OneRepMax = (function () {
  function render(container, opts) {
    const user = opts.user;
    const settings = App.Storage.getSettings(user.id);
    const profile = App.Storage.getProfile(user.id);

    // Before any set has ever been logged there's no formDefaults yet -- fall
    // back to the Build My Split profile (bodyweight/sex/unit) if one exists,
    // so a first-time visitor doesn't have to re-enter what they just told
    // the split questionnaire.
    const profileDefaults = profile
      ? { lift: 'squat', unit: profile.bodyweightUnit || 'kg', sex: profile.sex || 'male', bodyweight: profile.bodyweight }
      : { lift: 'squat', unit: settings.displayUnit || 'kg', sex: 'male' };

    const state = {
      displayUnit: settings.displayUnit || 'kg',
      formDefaults: settings.formDefaults || profileDefaults,
      lastResult: null,
    };

    const history = App.Storage.getHistory(user.id);
    if (history.length > 0) {
      const last = history[history.length - 1];
      state.lastResult = {
        result: {
          average: last.estimated1RM,
          epley: last.epley,
          brzycki: last.brzycki,
          lombardi: last.lombardi,
          unreliable: last.reps > App.OneRepMax.RELIABLE_REPS_LIMIT,
        },
        unit: last.unit,
        lift: last.lift,
        sex: last.sex,
        bodyweightKg: App.Units.convert(last.bodyweight, last.unit, 'kg'),
        oneRmKg: App.Units.convert(last.estimated1RM, last.unit, 'kg'),
      };
    }

    container.innerHTML =
      '<section class="page page-one-rep-max">' +
        '<div class="page-header">' +
          '<div class="page-title-row"><h1 class="page-title">1 Rep Max</h1><div id="orm-streak-badge"></div></div>' +
          '<div class="unit-toggle" id="unit-toggle" role="group" aria-label="Display unit">' +
            '<button type="button" class="unit-toggle-btn" data-unit="kg">kg</button>' +
            '<button type="button" class="unit-toggle-btn" data-unit="lb">lb</button>' +
          '</div>' +
        '</div>' +
        '<div id="orm-quick-links"></div>' +
        '<div class="card" id="info-panel-container"></div>' +
        '<div class="card" id="lift-form-container"></div>' +
        '<div class="card" id="result-container"></div>' +
        '<div class="card" id="gauge-container"></div>' +
      '</section>';

    const els = {
      infoPanel: container.querySelector('#info-panel-container'),
      form: container.querySelector('#lift-form-container'),
      result: container.querySelector('#result-container'),
      gauge: container.querySelector('#gauge-container'),
      unitToggle: container.querySelector('#unit-toggle'),
    };

    App.Components.StreakBadge.render(container.querySelector('#orm-streak-badge'), user);
    App.Components.QuickLinks.render(container.querySelector('#orm-quick-links'), user, 'one-rep-max');

    function saveSettings() {
      App.Storage.saveSettings(user.id, { displayUnit: state.displayUnit, formDefaults: state.formDefaults });
    }

    function getDisplayResult() {
      if (!state.lastResult) return null;
      const lr = state.lastResult;
      const conv = function (v) { return App.Units.convert(v, lr.unit, state.displayUnit); };
      return {
        average: conv(lr.result.average),
        epley: conv(lr.result.epley),
        brzycki: conv(lr.result.brzycki),
        lombardi: conv(lr.result.lombardi),
        unreliable: lr.result.unreliable,
      };
    }

    function renderForm() {
      App.Components.LiftForm.render(els.form, {
        defaults: state.formDefaults,
        userId: user.id,
        onSubmit: handleSubmit,
        onLiftChange: function (liftKey) { App.Components.ExerciseInfoPanel.render(els.infoPanel, liftKey, user.id); },
      });
    }

    function renderResult() {
      App.Components.ResultPanel.render(els.result, { result: getDisplayResult(), unit: state.displayUnit });
    }

    function renderGauge() {
      if (!state.lastResult) {
        App.Components.StandardsGauge.render(els.gauge, null);
        return;
      }
      const lr = state.lastResult;
      App.Components.StandardsGauge.render(els.gauge, {
        lift: lr.lift,
        sex: lr.sex,
        bodyweightKg: lr.bodyweightKg,
        oneRmKg: lr.oneRmKg,
        displayUnit: state.displayUnit,
      });
    }

    function handleSubmit(data) {
      const result = App.OneRepMax.estimate(data.weight, data.reps);
      const entry = {
        lift: data.lift,
        weight: data.weight,
        reps: data.reps,
        unit: data.unit,
        estimated1RM: result.average,
        epley: result.epley,
        brzycki: result.brzycki,
        lombardi: result.lombardi,
        bodyweight: data.bodyweight,
        sex: data.sex,
        addedWeight: data.addedWeight,
        date: new Date().toISOString(),
      };
      App.Storage.addEntry(user.id, entry);
      App.Storage.addBodyweightEntry(user.id, { date: entry.date, weight: data.bodyweight, unit: data.unit });

      const achievedGoal = App.Goals.checkAchievement(user.id);
      if (achievedGoal) App.Components.GoalCelebration.celebrate(achievedGoal, user);

      state.formDefaults = { lift: data.lift, unit: data.unit, sex: data.sex, bodyweight: data.bodyweight };
      saveSettings();

      state.lastResult = {
        result: result,
        unit: data.unit,
        lift: data.lift,
        sex: data.sex,
        bodyweightKg: App.Units.convert(data.bodyweight, data.unit, 'kg'),
        oneRmKg: App.Units.convert(result.average, data.unit, 'kg'),
      };

      renderResult();
      renderGauge();
      els.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function wireUnitToggle() {
      const buttons = els.unitToggle.querySelectorAll('.unit-toggle-btn');
      function refresh() {
        buttons.forEach(function (btn) {
          btn.classList.toggle('unit-toggle-btn--active', btn.dataset.unit === state.displayUnit);
        });
      }
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (btn.dataset.unit === state.displayUnit) return;
          state.displayUnit = btn.dataset.unit;
          saveSettings();
          refresh();
          renderResult();
          renderGauge();
        });
      });
      refresh();
    }

    wireUnitToggle();
    renderForm();
    renderResult();
    renderGauge();
  }

  return { render };
})();
