window.App = window.App || {};
App.Pages = App.Pages || {};

App.Pages.SplitBuilder = (function () {
  const TIME_OPTIONS = [30, 45, 60, 90];

  // Displayed Sunday-first per the questionnaire's convention; values are
  // App.SplitBuilder's own Monday-based weekday indices (0=Mon..6=Sun) so
  // they plug straight into the rest of the app without translation.
  const DISPLAY_WEEKDAYS = [
    { value: 6, short: 'Sun' },
    { value: 0, short: 'Mon' },
    { value: 1, short: 'Tue' },
    { value: 2, short: 'Wed' },
    { value: 3, short: 'Thu' },
    { value: 4, short: 'Fri' },
    { value: 5, short: 'Sat' },
  ];

  // Splits saved before rest-between-sets or weekday scheduling existed
  // won't have those fields yet -- backfill them (rest from that exercise's
  // default, weekday from array order using the same days/week mapping
  // buildSplit itself uses) so old saved splits keep working.
  function migrateSplit(user, profile, split) {
    let changed = false;
    const weekdays = App.SplitBuilder.weekdaysForDaysPerWeek((profile && profile.daysPerWeek) || split.days.length);
    split.days.forEach(function (day, i) {
      if (day.weekday == null) {
        day.weekday = weekdays[i] != null ? weekdays[i] : i;
        changed = true;
      }
      day.exercises.forEach(function (ex) {
        if (ex.restSeconds == null) {
          ex.restSeconds = App.SplitBuilder.getDefaultRestSeconds(ex.lift);
          changed = true;
        }
      });
    });
    if (changed) App.Storage.saveSplit(user.id, split);
    return split;
  }

  function render(container, opts) {
    const user = opts.user;
    const profile = App.Storage.getProfile(user.id);
    const existingSplit = App.Storage.getSplit(user.id);

    if (existingSplit) {
      renderResults(container, user, profile, migrateSplit(user, profile, existingSplit));
    } else {
      renderQuestionnaire(container, user, profile);
    }
  }

  function renderQuestionnaire(container, user, profile) {
    const d = profile || {};

    container.innerHTML =
      '<section class="page page-split">' +
        '<div class="page-header">' +
          '<div class="page-title-row"><h1 class="page-title">Build My Split</h1><div id="sb-streak-badge"></div></div>' +
        '</div>' +
        '<div id="sb-quick-links"></div>' +
        '<div class="card">' +
          '<p class="split-intro">Answer a few questions and get a full weekly training split — pick from ' + '22 exercises, fully editable afterward.</p>' +
          '<form class="split-form" novalidate>' +
            '<div class="field-row">' +
              '<div class="field">' +
                '<label for="sb-age">Age</label>' +
                '<input id="sb-age" type="number" inputmode="numeric" step="1" min="10" placeholder="e.g. 28" />' +
                '<p class="field-error" id="sb-age-error"></p>' +
              '</div>' +
              '<div class="field field-narrow">' +
                '<label for="sb-sex">Sex</label>' +
                '<select id="sb-sex">' +
                  '<option value="male"' + (d.sex === 'female' ? '' : ' selected') + '>Male</option>' +
                  '<option value="female"' + (d.sex === 'female' ? ' selected' : '') + '>Female</option>' +
                '</select>' +
              '</div>' +
            '</div>' +
            '<div class="field-row">' +
              '<div class="field">' +
                '<label for="sb-bodyweight">Bodyweight</label>' +
                '<input id="sb-bodyweight" type="number" inputmode="decimal" step="0.5" min="0" placeholder="e.g. 75" />' +
                '<p class="field-error" id="sb-bodyweight-error"></p>' +
              '</div>' +
              '<div class="field field-narrow">' +
                '<label for="sb-unit">Unit</label>' +
                '<select id="sb-unit">' +
                  '<option value="kg"' + (d.bodyweightUnit === 'lb' ? '' : ' selected') + '>kg</option>' +
                  '<option value="lb"' + (d.bodyweightUnit === 'lb' ? ' selected' : '') + '>lb</option>' +
                '</select>' +
              '</div>' +
            '</div>' +
            '<div class="field">' +
              '<label>Days available to train</label>' +
              '<div class="day-checkbox-grid">' +
                DISPLAY_WEEKDAYS.map(function (wd) {
                  const checked = (d.trainingWeekdays || []).indexOf(wd.value) !== -1;
                  return (
                    '<label class="day-checkbox">' +
                      '<input type="checkbox" class="sb-day-checkbox" value="' + wd.value + '"' + (checked ? ' checked' : '') + ' />' +
                      '<span>' + wd.short + '</span>' +
                    '</label>'
                  );
                }).join('') +
              '</div>' +
              '<p class="field-hint">Pick 2-6 days — the rest of the week becomes rest days.</p>' +
              '<p class="field-error" id="sb-days-error"></p>' +
            '</div>' +
            '<div class="field">' +
              '<label for="sb-time">Time per session</label>' +
              '<select id="sb-time">' +
                TIME_OPTIONS.map(function (m) {
                  const label = m === 90 ? '90+ min' : m + ' min';
                  return '<option value="' + m + '"' + (d.timePerSession === m ? ' selected' : '') + '>' + label + '</option>';
                }).join('') +
              '</select>' +
            '</div>' +
            '<div class="field">' +
              '<label for="sb-experience">Experience level</label>' +
              '<select id="sb-experience">' +
                '<option value="beginner"' + (d.experienceLevel === 'beginner' ? ' selected' : '') + '>Beginner</option>' +
                '<option value="intermediate"' + (!d.experienceLevel || d.experienceLevel === 'intermediate' ? ' selected' : '') + '>Intermediate</option>' +
                '<option value="advanced"' + (d.experienceLevel === 'advanced' ? ' selected' : '') + '>Advanced</option>' +
              '</select>' +
            '</div>' +
            '<button type="submit" class="btn-primary">Generate my split</button>' +
          '</form>' +
        '</div>' +
      '</section>';

    App.Components.StreakBadge.render(container.querySelector('#sb-streak-badge'), user);
    App.Components.QuickLinks.render(container.querySelector('#sb-quick-links'), user, 'split-builder');

    const form = container.querySelector('.split-form');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const ageError = container.querySelector('#sb-age-error');
      const bwError = container.querySelector('#sb-bodyweight-error');
      const daysError = container.querySelector('#sb-days-error');
      ageError.textContent = '';
      bwError.textContent = '';
      daysError.textContent = '';

      const age = parseInt(container.querySelector('#sb-age').value, 10);
      const bodyweight = parseFloat(container.querySelector('#sb-bodyweight').value);
      const bodyweightUnit = container.querySelector('#sb-unit').value;
      const sex = container.querySelector('#sb-sex').value;
      const trainingWeekdays = Array.prototype.slice.call(container.querySelectorAll('.sb-day-checkbox:checked'))
        .map(function (cb) { return parseInt(cb.value, 10); })
        .sort(function (a, b) { return a - b; });
      const timePerSession = parseInt(container.querySelector('#sb-time').value, 10);
      const experienceLevel = container.querySelector('#sb-experience').value;

      let hasError = false;
      if (!(age >= 10)) {
        ageError.textContent = 'Enter an age of 10 or older.';
        hasError = true;
      }
      if (!(bodyweight > 0)) {
        bwError.textContent = 'Enter a bodyweight greater than 0.';
        hasError = true;
      }
      if (!(trainingWeekdays.length >= 2 && trainingWeekdays.length <= 6)) {
        daysError.textContent = 'Select between 2 and 6 days.';
        hasError = true;
      }
      if (hasError) return;

      const newProfile = {
        age: age, bodyweight: bodyweight, bodyweightUnit: bodyweightUnit, sex: sex,
        daysPerWeek: trainingWeekdays.length, trainingWeekdays: trainingWeekdays,
        timePerSession: timePerSession, experienceLevel: experienceLevel,
      };
      App.Storage.saveProfile(user.id, newProfile);
      App.Storage.addBodyweightEntry(user.id, { date: new Date().toISOString(), weight: bodyweight, unit: bodyweightUnit });
      const achievedGoal = App.Goals.checkAchievement(user.id);
      if (achievedGoal) App.Components.GoalCelebration.celebrate(achievedGoal);
      const split = App.SplitBuilder.buildSplit(newProfile);
      App.Storage.saveSplit(user.id, split);
      renderResults(container, user, newProfile, split);
    });
  }

  function restSelectHtml(weekday, exIdx, restSeconds) {
    const presets = App.SplitBuilder.REST_PRESETS;
    const isPreset = presets.indexOf(restSeconds) !== -1;
    const select =
      '<select class="split-rest-select" data-weekday="' + weekday + '" data-idx="' + exIdx + '">' +
        presets.map(function (s) {
          const label = s < 120 ? s + 's' : (s / 60) + ' min';
          return '<option value="' + s + '"' + (restSeconds === s ? ' selected' : '') + '>' + label + '</option>';
        }).join('') +
        '<option value="custom"' + (!isPreset ? ' selected' : '') + '>Custom</option>' +
      '</select>';
    const custom =
      '<input type="number" class="split-rest-custom" min="0" step="5" value="' + restSeconds + '" ' +
        'data-weekday="' + weekday + '" data-idx="' + exIdx + '"' + (isPreset ? ' hidden' : '') + ' />';
    return select + custom;
  }

  function restLabel(restSeconds) {
    return restSeconds >= 120 ? (restSeconds / 60) + ' min' : restSeconds + 's';
  }

  function summaryText(ex) {
    return ex.sets + '&times;' + ex.reps + ' &middot; ' + restLabel(ex.restSeconds) + ' rest';
  }

  // Which exercise rows are expanded, keyed "weekday_exIdx", and which day's
  // reschedule control is open, keyed by weekday. Both module-level so they
  // survive a full re-render (add/remove/swap/reschedule) within the same
  // page visit; the expanded map is reset per-weekday whenever that day's
  // exercise list is spliced, since indices shift and a stale key would
  // expand the wrong row.
  const expandedState = {};
  const rescheduleOpenState = {};

  function renderResults(container, user, profile, split) {
    function persistAndRerender() {
      App.Storage.saveSplit(user.id, split);
      renderResults(container, user, profile, split);
    }

    function findDay(weekday) {
      return split.days.find(function (d) { return d.weekday === weekday; });
    }

    function resetExpandedForWeekday(weekday) {
      Object.keys(expandedState).forEach(function (key) {
        if (key.indexOf(weekday + '_') === 0) delete expandedState[key];
      });
    }

    // Lightweight path for fields that must recalculate live (sets, rest):
    // patch storage + just the day's time badge + that row's summary text
    // directly, instead of rebuilding the day's HTML, so a number input
    // mid-keystroke never loses focus.
    function updateLiveDisplays(weekday, exIdx) {
      App.Storage.saveSplit(user.id, split);
      const card = container.querySelector('.split-day-card[data-weekday="' + weekday + '"]');
      if (!card) return;
      const day = findDay(weekday);
      const badge = card.querySelector('.split-day-time-value');
      if (badge) badge.textContent = App.SplitBuilder.estimateMinutes(day.exercises);
      const row = card.querySelectorAll('.ex-row')[exIdx];
      const summaryEl = row && row.querySelector('.ex-row-summary');
      if (summaryEl) summaryEl.innerHTML = summaryText(day.exercises[exIdx]);
    }

    // Missed-workout reschedule: swap the two days' weekday assignments if
    // the target already has a workout (nothing is lost), otherwise just
    // move this workout there (the original day becomes a rest day).
    function rescheduleDay(fromWeekday, toWeekday) {
      const fromDay = findDay(fromWeekday);
      if (!fromDay) return;
      const toDay = findDay(toWeekday);
      if (toDay) {
        toDay.weekday = fromWeekday;
      }
      fromDay.weekday = toWeekday;
      delete rescheduleOpenState[fromWeekday];
      delete rescheduleOpenState[toWeekday];
      persistAndRerender();
    }

    const WEEKDAY_NAMES = App.SplitBuilder.WEEKDAY_NAMES;

    const dayCardsHtml = [0, 1, 2, 3, 4, 5, 6].map(function (weekday) {
      const day = findDay(weekday);

      if (!day) {
        return (
          '<div class="card split-day-card split-day-card--rest" data-weekday="' + weekday + '">' +
            '<p class="split-day-weekday">' + WEEKDAY_NAMES[weekday] + '</p>' +
            '<h3 class="split-day-title split-day-title--rest">Rest Day</h3>' +
          '</div>'
        );
      }

      const bucketsLabel = day.buckets.map(function (b) { return App.SplitBuilder.BUCKET_LABELS[b]; }).join(' + ');
      const minutes = App.SplitBuilder.estimateMinutes(day.exercises);
      const isRescheduleOpen = !!rescheduleOpenState[weekday];

      const rowsHtml = day.exercises.length === 0
        ? '<p class="empty-hint">No exercises in this day yet — add one below.</p>'
        : '<ul class="split-exercise-list">' +
            day.exercises.map(function (ex, exIdx) {
              const isOpen = !!expandedState[weekday + '_' + exIdx];
              return (
                '<li class="ex-row">' +
                  '<div class="ex-row-header">' +
                    '<div class="ex-picker-slot ex-name-slot" data-weekday="' + weekday + '" data-idx="' + exIdx + '"></div>' +
                    '<span class="ex-row-summary">' + summaryText(ex) + '</span>' +
                    '<button type="button" class="ex-row-toggle' + (isOpen ? ' ex-row-toggle--open' : '') + '" data-weekday="' + weekday + '" data-idx="' + exIdx + '" aria-expanded="' + isOpen + '" aria-label="Edit sets, reps, and rest">&#9662;</button>' +
                    '<button type="button" class="ex-row-remove" data-weekday="' + weekday + '" data-idx="' + exIdx + '" aria-label="Remove exercise">&times;</button>' +
                  '</div>' +
                  '<div class="ex-row-body"' + (isOpen ? '' : ' hidden') + '>' +
                    '<label class="rx-inline"><span class="rx-label">Sets</span>' +
                      '<input type="number" class="split-sets-input" min="1" step="1" value="' + ex.sets + '" data-weekday="' + weekday + '" data-idx="' + exIdx + '" />' +
                    '</label>' +
                    '<label class="rx-inline"><span class="rx-label">Reps</span>' +
                      '<input type="text" inputmode="numeric" class="split-reps-input" value="' + ex.reps + '" data-weekday="' + weekday + '" data-idx="' + exIdx + '" />' +
                    '</label>' +
                    '<label class="rx-inline"><span class="rx-label">Rest</span>' + restSelectHtml(weekday, exIdx, ex.restSeconds) + '</label>' +
                  '</div>' +
                '</li>'
              );
            }).join('') +
          '</ul>';

      const rescheduleOptionsHtml = [0, 1, 2, 3, 4, 5, 6].filter(function (w) { return w !== weekday; }).map(function (w) {
        return '<button type="button" class="day-reschedule-option" data-from="' + weekday + '" data-to="' + w + '">' + WEEKDAY_NAMES[w].slice(0, 3) + '</button>';
      }).join('');

      // Completion is tracked per actual calendar date -- this week's
      // occurrence of this weekday, not the weekday template slot itself.
      const thisWeekKey = App.Schedule.dateKey(App.Schedule.dateForWeekday(weekday));
      const isDone = App.Schedule.isCompleted(user.id, thisWeekKey);

      return (
        '<div class="card split-day-card" data-weekday="' + weekday + '">' +
          '<div class="split-day-head">' +
            '<div class="split-day-heading">' +
              '<p class="split-day-weekday">' + WEEKDAY_NAMES[weekday] + '</p>' +
              '<h3 class="split-day-title">' + day.label + '</h3>' +
              '<p class="split-day-buckets">' + bucketsLabel + '</p>' +
            '</div>' +
            '<div class="split-day-time-badge">' +
              '<span class="split-day-time-value">' + minutes + '</span>' +
              '<span class="split-day-time-unit">min</span>' +
            '</div>' +
          '</div>' +
          rowsHtml +
          '<div class="split-add-row">' +
            '<div class="ex-picker-slot ex-add-slot" data-weekday="' + weekday + '"></div>' +
            '<button type="button" class="btn-ghost-sm split-add-btn" data-weekday="' + weekday + '">+ Add exercise</button>' +
          '</div>' +
          '<div class="day-complete-row">' +
            '<button type="button" class="day-complete-btn' + (isDone ? ' day-complete-btn--done' : '') + '" data-weekday="' + weekday + '">' +
              (isDone ? '&#10003; Completed this week' : 'Mark complete') +
            '</button>' +
          '</div>' +
          '<div class="day-missed-row">' +
            '<button type="button" class="btn-ghost-sm day-missed-btn' + (isRescheduleOpen ? ' day-missed-btn--open' : '') + '" data-weekday="' + weekday + '">' + (isRescheduleOpen ? 'Cancel' : 'Missed this workout') + '</button>' +
          '</div>' +
          '<div class="day-reschedule"' + (isRescheduleOpen ? '' : ' hidden') + ' data-weekday="' + weekday + '">' +
            '<p class="day-reschedule-label">Move this workout to:</p>' +
            '<div class="day-reschedule-options">' + rescheduleOptionsHtml + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    container.innerHTML =
      '<section class="page page-split">' +
        '<div class="page-header">' +
          '<div class="page-title-row"><h1 class="page-title">Build My Split</h1><div id="sb-streak-badge"></div></div>' +
        '</div>' +
        '<div id="sb-quick-links"></div>' +
        '<p class="split-disclaimer">A rule-based weekly template from your answers, not personalized coaching — sets, reps, and rest are starting points, edit anything below.</p>' +
        dayCardsHtml +
        '<button type="button" class="btn-ghost" id="sb-regenerate">Regenerate</button>' +
      '</section>';

    App.Components.StreakBadge.render(container.querySelector('#sb-streak-badge'), user);
    App.Components.QuickLinks.render(container.querySelector('#sb-quick-links'), user, 'split-builder');

    container.querySelectorAll('.ex-row-toggle').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const key = btn.dataset.weekday + '_' + btn.dataset.idx;
        const isOpen = !expandedState[key];
        expandedState[key] = isOpen;
        const body = btn.closest('.ex-row').querySelector('.ex-row-body');
        body.hidden = !isOpen;
        btn.setAttribute('aria-expanded', String(isOpen));
        btn.classList.toggle('ex-row-toggle--open', isOpen);
      });
    });

    container.querySelectorAll('.ex-name-slot').forEach(function (slot) {
      const weekday = parseInt(slot.dataset.weekday, 10);
      const exIdx = parseInt(slot.dataset.idx, 10);
      App.Components.ExercisePicker.render(slot, {
        id: 'sb-swap-' + weekday + '-' + exIdx,
        value: findDay(weekday).exercises[exIdx].lift,
        triggerClass: 'ex-picker-trigger--inline',
        userId: user.id,
        onChange: function (newLift) {
          const sr = App.SplitBuilder.getSetsReps(newLift, profile.experienceLevel);
          findDay(weekday).exercises[exIdx] = {
            lift: newLift, sets: sr.sets, reps: sr.reps,
            restSeconds: App.SplitBuilder.getDefaultRestSeconds(newLift),
          };
          persistAndRerender();
        },
      });
    });

    const addPickerValues = {};
    container.querySelectorAll('.ex-add-slot').forEach(function (slot) {
      const weekday = parseInt(slot.dataset.weekday, 10);
      if (addPickerValues[weekday] == null) addPickerValues[weekday] = App.Standards.CATEGORIES[0].lifts[0];
      App.Components.ExercisePicker.render(slot, {
        id: 'sb-add-' + weekday,
        value: addPickerValues[weekday],
        userId: user.id,
        onChange: function (newLift) { addPickerValues[weekday] = newLift; },
      });
    });

    container.querySelectorAll('.ex-row-remove').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const weekday = parseInt(btn.dataset.weekday, 10);
        const exIdx = parseInt(btn.dataset.idx, 10);
        findDay(weekday).exercises.splice(exIdx, 1);
        resetExpandedForWeekday(weekday);
        persistAndRerender();
      });
    });

    container.querySelectorAll('.split-add-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const weekday = parseInt(btn.dataset.weekday, 10);
        const lift = addPickerValues[weekday] || App.Standards.CATEGORIES[0].lifts[0];
        const sr = App.SplitBuilder.getSetsReps(lift, profile.experienceLevel);
        findDay(weekday).exercises.push({
          lift: lift, sets: sr.sets, reps: sr.reps,
          restSeconds: App.SplitBuilder.getDefaultRestSeconds(lift),
        });
        persistAndRerender();
      });
    });

    container.querySelectorAll('.split-sets-input').forEach(function (inp) {
      inp.addEventListener('input', function () {
        const val = parseInt(inp.value, 10);
        if (!(val >= 1)) return;
        const weekday = parseInt(inp.dataset.weekday, 10);
        const exIdx = parseInt(inp.dataset.idx, 10);
        findDay(weekday).exercises[exIdx].sets = val;
        updateLiveDisplays(weekday, exIdx);
      });
    });

    container.querySelectorAll('.split-reps-input').forEach(function (inp) {
      inp.addEventListener('change', function () {
        const weekday = parseInt(inp.dataset.weekday, 10);
        const exIdx = parseInt(inp.dataset.idx, 10);
        const val = inp.value.trim();
        if (!val) { inp.value = findDay(weekday).exercises[exIdx].reps; return; }
        findDay(weekday).exercises[exIdx].reps = val;
        updateLiveDisplays(weekday, exIdx);
      });
    });

    container.querySelectorAll('.split-rest-select').forEach(function (sel) {
      sel.addEventListener('change', function () {
        const weekday = parseInt(sel.dataset.weekday, 10);
        const exIdx = parseInt(sel.dataset.idx, 10);
        const customInput = container.querySelector('.split-rest-custom[data-weekday="' + weekday + '"][data-idx="' + exIdx + '"]');
        if (sel.value === 'custom') {
          customInput.hidden = false;
          customInput.focus();
          return;
        }
        customInput.hidden = true;
        findDay(weekday).exercises[exIdx].restSeconds = parseInt(sel.value, 10);
        updateLiveDisplays(weekday, exIdx);
      });
    });

    container.querySelectorAll('.split-rest-custom').forEach(function (inp) {
      inp.addEventListener('input', function () {
        const val = parseInt(inp.value, 10);
        if (!(val >= 0)) return;
        const weekday = parseInt(inp.dataset.weekday, 10);
        const exIdx = parseInt(inp.dataset.idx, 10);
        findDay(weekday).exercises[exIdx].restSeconds = val;
        updateLiveDisplays(weekday, exIdx);
      });
    });

    container.querySelectorAll('.day-complete-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const weekday = parseInt(btn.dataset.weekday, 10);
        const key = App.Schedule.dateKey(App.Schedule.dateForWeekday(weekday));
        const nowDone = !App.Schedule.isCompleted(user.id, key);
        App.Schedule.setCompleted(user.id, key, weekday, nowDone);
        App.Schedule.recalculateStreak(user.id, split);
        App.Components.StreakBadge.render(container.querySelector('#sb-streak-badge'), user);
        btn.classList.toggle('day-complete-btn--done', nowDone);
        btn.innerHTML = nowDone ? '&#10003; Completed this week' : 'Mark complete';
      });
    });

    container.querySelectorAll('.day-missed-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const weekday = parseInt(btn.dataset.weekday, 10);
        const isOpen = !rescheduleOpenState[weekday];
        rescheduleOpenState[weekday] = isOpen;
        const panel = btn.closest('.card').querySelector('.day-reschedule');
        panel.hidden = !isOpen;
        btn.textContent = isOpen ? 'Cancel' : 'Missed this workout';
        btn.classList.toggle('day-missed-btn--open', isOpen);
      });
    });

    container.querySelectorAll('.day-reschedule-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        rescheduleDay(parseInt(btn.dataset.from, 10), parseInt(btn.dataset.to, 10));
      });
    });

    container.querySelector('#sb-regenerate').addEventListener('click', function () {
      renderQuestionnaire(container, user, profile);
    });
  }

  return { render };
})();
