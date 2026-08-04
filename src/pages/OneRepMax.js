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
      // idle (attemptable) / confirming / succeeded / failed -- see
      // ResultPanel. justConfirmed/isNewPb only matter for the flavor
      // message right after an actual confirm action, not when merely
      // re-displaying an already-confirmed entry (unit toggle, reload).
      attemptPhase: 'idle',
      justConfirmed: false,
      isNewPb: false,
      // The gauge only expands to its full detail once a set is actually
      // logged IN THIS VISIT -- lastResult below can get pre-populated
      // from history on load purely so the result panel/rest-of-page has
      // something to show, but rendering the full segmented gauge before
      // the user has done anything this session is exactly the premature
      // clutter this flag avoids. See renderGauge().
      gaugeExpanded: false,
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
        entryId: last.id,
      };
      state.attemptPhase = last.attemptStatus === 'succeeded' ? 'succeeded' : last.attemptStatus === 'failed' ? 'failed' : 'idle';
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
        '<div id="rest-timer-prompt-container"></div>' +
        '<div class="card" id="gauge-container"></div>' +
      '</section>';

    const els = {
      infoPanel: container.querySelector('#info-panel-container'),
      form: container.querySelector('#lift-form-container'),
      result: container.querySelector('#result-container'),
      restTimerPrompt: container.querySelector('#rest-timer-prompt-container'),
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
      App.Components.ResultPanel.render(els.result, {
        result: getDisplayResult(),
        unit: state.displayUnit,
        attemptPhase: state.attemptPhase,
        justConfirmed: state.justConfirmed,
        isNewPb: state.isNewPb,
        onAttempt: handleAttempt,
        onConfirm: handleConfirm,
      });
    }

    // The gauge ranks the CONFIRMED PB for the current lift -- never the
    // raw just-logged estimate, and never whatever's in state.lastResult
    // directly, since that could be a still-pending or even failed
    // attempt. No confirmed entry yet for this lift (including "nothing
    // confirmed at all") reads the same as no result -- the collapsed
    // empty state, same one StandardsGauge already uses.
    function renderGauge() {
      if (!state.gaugeExpanded || !state.lastResult) {
        App.Components.StandardsGauge.render(els.gauge, null);
        return;
      }
      const lift = state.lastResult.lift;
      const pbEntry = App.Storage.getConfirmedPbEntry(user.id, lift);
      if (!pbEntry) {
        App.Components.StandardsGauge.render(els.gauge, null);
        return;
      }
      App.Components.StandardsGauge.render(els.gauge, {
        lift: lift,
        sex: pbEntry.sex,
        bodyweightKg: App.Units.convert(pbEntry.bodyweight, pbEntry.unit, 'kg'),
        oneRmKg: App.Units.convert(pbEntry.estimated1RM, pbEntry.unit, 'kg'),
        displayUnit: state.displayUnit,
      });
    }

    function handleAttempt() {
      state.attemptPhase = 'confirming';
      renderResult();
    }

    function handleConfirm(success) {
      const lr = state.lastResult;
      if (!lr || lr.entryId == null) return;

      if (success) {
        // Captured BEFORE this entry is marked succeeded, so it's
        // genuinely the PRIOR confirmed max -- 0 if nothing's ever been
        // confirmed for this lift yet, which makes a first-ever
        // confirmed attempt trivially "a new PB" too.
        const priorPbEntry = App.Storage.getConfirmedPbEntry(user.id, lr.lift);
        const priorBestKg = priorPbEntry ? App.Units.convert(priorPbEntry.estimated1RM, priorPbEntry.unit, 'kg') : 0;
        const newKg = App.Units.convert(lr.result.average, lr.unit, 'kg');
        const isNewPb = newKg > priorBestKg;

        App.Storage.updateEntryAttemptStatus(user.id, lr.entryId, 'succeeded');

        if (isNewPb) {
          App.Communities.logActivity(user.id, 'pr', {
            lift: lr.lift,
            lift_label: App.ExerciseLibrary.label(lr.lift),
            value: App.Units.round(lr.result.average, 1),
            unit: lr.unit,
          });
        }

        const achievedGoal = App.Goals.checkAchievement(user.id);
        if (achievedGoal) App.Components.GoalCelebration.celebrate(achievedGoal, user);

        state.attemptPhase = 'succeeded';
        state.isNewPb = isNewPb;
      } else {
        App.Storage.updateEntryAttemptStatus(user.id, lr.entryId, 'failed');
        state.attemptPhase = 'failed';
        state.isNewPb = false;
      }

      state.justConfirmed = true;
      renderResult();
      renderGauge();
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
        attemptStatus: null,
      };
      const list = App.Storage.addEntry(user.id, entry);
      const savedEntry = list[list.length - 1];
      App.Storage.addBodyweightEntry(user.id, { date: entry.date, weight: data.bodyweight, unit: data.unit });

      // Safe to call unconditionally: bodyweight-type goals can still be
      // affected by the bodyweight entry just added above, and
      // exercise-type goals only ever move via a confirmed PB now (see
      // handleConfirm) -- this is a no-op for those until a success
      // confirmation actually changes the confirmed PB.
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
        entryId: savedEntry.id,
      };
      state.attemptPhase = 'idle';
      state.justConfirmed = false;
      state.isNewPb = false;
      state.gaugeExpanded = true;

      renderResult();
      renderGauge();
      els.result.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Manual start only -- this is a tap-to-start prompt, not an
      // auto-starting timer. Only ever shown right after an actual submit
      // in this page visit (not just because a lastResult exists from
      // history on page load), and reflects the SCHEDULED workout's rest
      // setting for this exercise if today's split has it, falling back to
      // a sensible default otherwise (see RestTimer.getRestDurationFor).
      const restSeconds = App.Components.RestTimer.getRestDurationFor(user, data.lift);
      App.Components.RestTimer.showPrompt(els.restTimerPrompt, restSeconds);
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
