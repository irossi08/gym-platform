window.App = window.App || {};
App.Pages = App.Pages || {};

App.Pages.Home = (function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Single-person-plus-a-"+" glyph -- deliberately distinct from the
  // two-person group icon used for Community in the bottom nav bar, so
  // the two read as separate destinations rather than duplicates of each
  // other.
  function friendsIconSvg() {
    return (
      '<svg viewBox="0 0 24 24" class="home-friends-icon" aria-hidden="true">' +
        '<circle cx="10" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2" />' +
        '<path d="M3 20c0-3.9 3.1-7 7-7s7 3.1 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />' +
        '<line x1="19" y1="4" x2="19" y2="11" stroke="currentColor" stroke-width="2" stroke-linecap="round" />' +
        '<line x1="15.5" y1="7.5" x2="22.5" y2="7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />' +
      '</svg>'
    );
  }

  // Generic "how far from start to target" progress, sign-aware so it works
  // for both a decreasing target (lose weight) and an increasing one (gain
  // weight, raise a 1RM).
  function computeGoalProgress(start, latest, target) {
    const totalDistance = target - start;
    const reached = totalDistance >= 0 ? latest >= target : latest <= target;
    const percent = totalDistance !== 0
      ? Math.max(0, Math.min(1, (latest - start) / totalDistance)) * 100
      : (reached ? 100 : 0);
    return { percent: percent, remaining: target - latest, reached: reached };
  }

  function bodyweightGoalPoints(user, unit) {
    return App.Storage.getBodyweightLog(user.id)
      .map(function (e) { return { date: new Date(e.date), value: App.Units.convert(e.weight, e.unit, unit) }; })
      .sort(function (a, b) { return a.date - b.date; });
  }

  function exerciseGoalPoints(user, lift, unit) {
    return App.Storage.getHistory(user.id)
      .filter(function (e) { return e.lift === lift; })
      .map(function (e) { return { date: new Date(e.date), value: App.Units.convert(e.estimated1RM, e.unit, unit) }; })
      .sort(function (a, b) { return a.date - b.date; });
  }

  // Shared bodyweight quick-log, embedded in the goal card in both its
  // prompt and progress states -- useful for exercise-goal users too, not
  // just bodyweight-goal ones, so it's not gated behind goal type.
  function bodyweightQuickLogHtml(defaultUnit) {
    return (
      '<hr class="goal-divider" />' +
      '<div class="goal-bw-quicklog">' +
        '<p class="goal-bw-quicklog-label">Log today&rsquo;s bodyweight</p>' +
        '<div class="field-row">' +
          '<div class="field">' +
            '<input type="number" class="goal-bw-input" step="0.5" min="0" placeholder="e.g. 75" />' +
          '</div>' +
          '<div class="field field-narrow">' +
            '<select class="goal-bw-unit">' +
              '<option value="kg"' + (defaultUnit === 'lb' ? '' : ' selected') + '>kg</option>' +
              '<option value="lb"' + (defaultUnit === 'lb' ? ' selected' : '') + '>lb</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<p class="field-error goal-bw-error"></p>' +
        '<button type="button" class="btn-ghost-sm goal-bw-save">Log today</button>' +
      '</div>'
    );
  }

  function wireBodyweightQuickLog(container, user, onLogged) {
    const saveBtn = container.querySelector('.goal-bw-save');
    if (!saveBtn) return;
    saveBtn.addEventListener('click', function () {
      const errorEl = container.querySelector('.goal-bw-error');
      errorEl.textContent = '';
      const input = container.querySelector('.goal-bw-input');
      const unit = container.querySelector('.goal-bw-unit').value;
      const weight = parseFloat(input.value);
      if (!(weight > 0)) {
        errorEl.textContent = 'Enter a weight greater than 0.';
        return;
      }
      App.Storage.addBodyweightEntry(user.id, { date: new Date().toISOString(), weight: weight, unit: unit });
      const achievedGoal = App.Goals.checkAchievement(user.id);
      if (achievedGoal) App.Components.GoalCelebration.celebrate(achievedGoal, user);
      saveBtn.disabled = true;
      saveBtn.textContent = '✓ Logged';
      setTimeout(function () { onLogged(); }, 600);
    });
  }

  function renderGoalPrompt(container, user) {
    const defaultUnit = App.Storage.getSettings(user.id).displayUnit || 'kg';
    container.innerHTML =
      '<h2 class="section-title">Goal</h2>' +
      '<p class="empty-hint">No goal set yet — pick a bodyweight target or an exercise 1RM to aim for.</p>' +
      '<button type="button" class="btn-primary" id="goal-start-btn">Set a goal</button>' +
      bodyweightQuickLogHtml(defaultUnit);
    container.querySelector('#goal-start-btn').addEventListener('click', function () {
      renderGoalForm(container, user, null);
    });
    wireBodyweightQuickLog(container, user, function () { renderGoalCard(container, user); });
  }

  function renderGoalProgress(container, user, goal) {
    let points, startValue;
    if (goal.type === 'bodyweight') {
      points = bodyweightGoalPoints(user, goal.unit);
      startValue = goal.startWeight;
    } else {
      points = exerciseGoalPoints(user, goal.lift, goal.unit);
      startValue = points.length ? points[0].value : goal.targetWeight;
    }
    const latestValue = points.length ? points[points.length - 1].value : startValue;
    const progress = computeGoalProgress(startValue, latestValue, goal.targetWeight);

    const title = goal.type === 'bodyweight'
      ? (goal.direction === 'lose' ? 'Lose ' : 'Gain ') + goal.amount + ' ' + goal.unit
      : App.ExerciseLibrary.label(goal.lift) + ': ' + goal.targetWeight + ' ' + goal.unit;

    const statusHtml = progress.reached
      ? '<p class="goal-status goal-status--reached">&#10003; Goal reached!</p>'
      : '<p class="goal-status">' + Math.abs(Math.round(progress.remaining)) + ' ' + goal.unit + ' to go &middot; ' + Math.round(progress.percent) + '% there</p>';

    const defaultUnit = App.Storage.getSettings(user.id).displayUnit || 'kg';

    container.innerHTML =
      '<div class="goal-card-head">' +
        '<h2 class="section-title">Goal</h2>' +
        '<button type="button" class="btn-ghost-sm" id="goal-edit-btn">Edit</button>' +
      '</div>' +
      '<p class="goal-title">' + title + '</p>' +
      statusHtml +
      '<div class="goal-chart-wrap" id="goal-chart-slot"></div>' +
      bodyweightQuickLogHtml(defaultUnit);

    App.Components.GoalChart.render(container.querySelector('#goal-chart-slot'), {
      points: points,
      goalValue: goal.targetWeight,
      unit: goal.unit,
      emptyMessage: goal.type === 'bodyweight'
        ? 'Log your bodyweight below to start tracking progress.'
        : 'Log a set for this exercise to start tracking progress.',
    });

    container.querySelector('#goal-edit-btn').addEventListener('click', function () {
      renderGoalForm(container, user, goal);
    });
    wireBodyweightQuickLog(container, user, function () { renderGoalCard(container, user); });
  }

  function renderGoalAchieved(container, user, goal) {
    const target = App.Units.round(goal.targetWeight, 1);
    const message = goal.type === 'bodyweight'
      ? 'You reached your ' + (goal.direction === 'lose' ? 'lose' : 'gain') + ' goal — ' + target + ' ' + goal.unit + '! \u{1F4AA}'
      : 'You hit ' + target + ' ' + goal.unit + ' on ' + App.ExerciseLibrary.label(goal.lift) + '! \u{1F4AA}';
    const defaultUnit = App.Storage.getSettings(user.id).displayUnit || 'kg';

    container.innerHTML =
      '<h2 class="section-title">Goal</h2>' +
      '<div class="goal-achieved-banner">' +
        '<p class="goal-achieved-message">&#127881; Goal reached!</p>' +
        '<p class="goal-achieved-detail">' + message + '</p>' +
      '</div>' +
      '<button type="button" class="btn-primary" id="goal-new-btn">Set a new goal</button>' +
      bodyweightQuickLogHtml(defaultUnit);

    container.querySelector('#goal-new-btn').addEventListener('click', function () {
      App.Storage.clearGoal(user.id);
      renderGoalForm(container, user, null);
    });
    wireBodyweightQuickLog(container, user, function () { renderGoalCard(container, user); });
  }

  function renderGoalForm(container, user, existingGoal) {
    const isBodyweight = !existingGoal || existingGoal.type === 'bodyweight';

    container.innerHTML =
      '<h2 class="section-title">' + (existingGoal ? 'Edit Goal' : 'Set a Goal') + '</h2>' +
      '<div class="goal-type-toggle">' +
        '<button type="button" class="goal-type-btn' + (isBodyweight ? ' goal-type-btn--active' : '') + '" data-type="bodyweight">Bodyweight</button>' +
        '<button type="button" class="goal-type-btn' + (!isBodyweight ? ' goal-type-btn--active' : '') + '" data-type="exercise">Exercise 1RM</button>' +
      '</div>' +
      '<form class="goal-form" novalidate>' +
        '<div class="goal-fields-bodyweight"' + (isBodyweight ? '' : ' hidden') + '>' +
          '<div class="field-row">' +
            '<div class="field field-narrow">' +
              '<label for="goal-direction">Direction</label>' +
              '<select id="goal-direction">' +
                '<option value="lose"' + (existingGoal && existingGoal.direction === 'gain' ? '' : ' selected') + '>Lose</option>' +
                '<option value="gain"' + (existingGoal && existingGoal.direction === 'gain' ? ' selected' : '') + '>Gain</option>' +
              '</select>' +
            '</div>' +
            '<div class="field">' +
              '<label for="goal-bw-amount">Amount</label>' +
              '<input type="number" id="goal-bw-amount" step="0.5" min="0" placeholder="e.g. 5"' +
                (existingGoal && existingGoal.type === 'bodyweight' ? ' value="' + existingGoal.amount + '"' : '') + ' />' +
            '</div>' +
            '<div class="field field-narrow">' +
              '<label for="goal-bw-unit">Unit</label>' +
              '<select id="goal-bw-unit">' +
                '<option value="kg"' + (existingGoal && existingGoal.unit === 'lb' ? '' : ' selected') + '>kg</option>' +
                '<option value="lb"' + (existingGoal && existingGoal.unit === 'lb' ? ' selected' : '') + '>lb</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
          '<p class="field-hint">Uses your most recent bodyweight entry as the starting point.</p>' +
        '</div>' +
        '<div class="goal-fields-exercise"' + (isBodyweight ? ' hidden' : '') + '>' +
          '<div class="field">' +
            '<label>Exercise</label>' +
            '<div id="goal-exercise-picker-slot"></div>' +
          '</div>' +
          '<div class="field-row">' +
            '<div class="field">' +
              '<label for="goal-ex-weight">Target 1RM</label>' +
              '<input type="number" id="goal-ex-weight" step="0.5" min="0" placeholder="e.g. 100"' +
                (existingGoal && existingGoal.type === 'exercise' ? ' value="' + existingGoal.targetWeight + '"' : '') + ' />' +
            '</div>' +
            '<div class="field field-narrow">' +
              '<label for="goal-ex-unit">Unit</label>' +
              '<select id="goal-ex-unit">' +
                '<option value="kg"' + (existingGoal && existingGoal.unit === 'lb' ? '' : ' selected') + '>kg</option>' +
                '<option value="lb"' + (existingGoal && existingGoal.unit === 'lb' ? ' selected' : '') + '>lb</option>' +
              '</select>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<p class="field-error" id="goal-error"></p>' +
        '<div class="goal-form-actions">' +
          '<button type="submit" class="btn-primary">Save goal</button>' +
          (existingGoal ? '<button type="button" class="btn-ghost-sm" id="goal-remove-btn">Remove goal</button>' : '') +
          '<button type="button" class="btn-ghost-sm" id="goal-cancel-btn">Cancel</button>' +
        '</div>' +
      '</form>';

    let selectedType = isBodyweight ? 'bodyweight' : 'exercise';
    let selectedLift = (existingGoal && existingGoal.type === 'exercise') ? existingGoal.lift : App.Standards.CATEGORIES[0].lifts[0];

    const bwFields = container.querySelector('.goal-fields-bodyweight');
    const exFields = container.querySelector('.goal-fields-exercise');

    App.Components.ExercisePicker.render(container.querySelector('#goal-exercise-picker-slot'), {
      id: 'goal-exercise-picker',
      value: selectedLift,
      userId: user.id,
      onChange: function (lift) { selectedLift = lift; },
    });

    container.querySelectorAll('.goal-type-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedType = btn.dataset.type;
        container.querySelectorAll('.goal-type-btn').forEach(function (b) {
          b.classList.toggle('goal-type-btn--active', b === btn);
        });
        bwFields.hidden = selectedType !== 'bodyweight';
        exFields.hidden = selectedType !== 'exercise';
      });
    });

    container.querySelector('#goal-cancel-btn').addEventListener('click', function () {
      if (existingGoal) renderGoalProgress(container, user, existingGoal);
      else renderGoalPrompt(container, user);
    });

    const removeBtn = container.querySelector('#goal-remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        App.Storage.clearGoal(user.id);
        renderGoalPrompt(container, user);
      });
    }

    container.querySelector('.goal-form').addEventListener('submit', function (e) {
      e.preventDefault();
      const errorEl = container.querySelector('#goal-error');
      errorEl.textContent = '';

      if (selectedType === 'bodyweight') {
        const direction = container.querySelector('#goal-direction').value;
        const amount = parseFloat(container.querySelector('#goal-bw-amount').value);
        const unit = container.querySelector('#goal-bw-unit').value;
        if (!(amount > 0)) {
          errorEl.textContent = 'Enter an amount greater than 0.';
          return;
        }
        const log = App.Storage.getBodyweightLog(user.id);
        if (log.length === 0) {
          errorEl.textContent = 'Log your bodyweight at least once first, then come back to set this goal.';
          return;
        }
        const latest = log.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); })[0];
        const startWeight = App.Units.round(App.Units.convert(latest.weight, latest.unit, unit), 1);
        const targetWeight = direction === 'lose' ? startWeight - amount : startWeight + amount;

        const goal = {
          type: 'bodyweight', direction: direction, amount: amount,
          startWeight: startWeight, targetWeight: targetWeight, unit: unit,
          createdAt: new Date().toISOString(),
        };
        App.Storage.saveGoal(user.id, goal);
        renderGoalProgress(container, user, goal);
      } else {
        const targetWeight = parseFloat(container.querySelector('#goal-ex-weight').value);
        const unit = container.querySelector('#goal-ex-unit').value;
        if (!(targetWeight > 0)) {
          errorEl.textContent = 'Enter a target weight greater than 0.';
          return;
        }
        const goal = { type: 'exercise', lift: selectedLift, targetWeight: targetWeight, unit: unit, createdAt: new Date().toISOString() };
        App.Storage.saveGoal(user.id, goal);
        renderGoalProgress(container, user, goal);
      }
    });
  }

  function renderGoalCard(container, user) {
    const goal = App.Storage.getGoal(user.id);
    if (!goal) renderGoalPrompt(container, user);
    else if (goal.achieved) renderGoalAchieved(container, user, goal);
    else renderGoalProgress(container, user, goal);
  }

  function renderTrendCard(container, user) {
    const history = App.Storage.getHistory(user.id);
    const displayUnit = App.Storage.getSettings(user.id).displayUnit || 'kg';

    if (history.length === 0) {
      container.innerHTML =
        '<h2 class="section-title">Recent Progress</h2>' +
        '<div class="empty-state"><p class="empty-hint">No sets logged yet — log your first set to start building your history.</p></div>' +
        '<a href="#/one-rep-max" class="btn-ghost-sm home-link-btn">Log a set</a>';
      return;
    }

    container.innerHTML =
      '<h2 class="section-title">Recent Progress</h2>' +
      '<div class="home-trend-wrap" id="home-trend-chart-slot"></div>' +
      '<a href="#/history" class="btn-ghost-sm home-link-btn">View full history &rarr;</a>';

    App.Components.ProgressChart.render(container.querySelector('#home-trend-chart-slot'), {
      entries: history,
      displayUnit: displayUnit,
    });
  }

  function renderTodayWorkout(container, user, onToggle) {
    const split = App.Storage.getSplit(user.id);
    const todayWd = App.Schedule.todayWeekday();
    const todayKey = App.Schedule.dateKey(new Date());

    if (!split) {
      container.innerHTML =
        '<h2 class="section-title">Today&rsquo;s Workout</h2>' +
        '<div class="empty-state"><p class="empty-hint">You haven&rsquo;t built a split yet.</p></div>' +
        '<a href="#/split-builder" class="btn-primary">Build My Split</a>';
      return;
    }

    const day = split.days.find(function (d) { return d.weekday === todayWd; });

    if (!day) {
      container.innerHTML =
        '<h2 class="section-title">Today&rsquo;s Workout</h2>' +
        '<div class="home-rest-state">' +
          '<p class="home-rest-label">Rest Day</p>' +
          '<p class="empty-hint">Nothing scheduled today — recover up.</p>' +
        '</div>';
      return;
    }

    const details = App.Schedule.getCompletionDetails(user.id, todayKey);
    const completed = !!(details && details.completed);
    const minutes = App.SplitBuilder.estimateMinutes(day.exercises);
    const exerciseListHtml = day.exercises.map(function (ex) {
      return '<li>' + App.ExerciseLibrary.label(ex.lift) + '</li>';
    }).join('');

    // Auto-detected (geolocation, App.Components.GymAutoComplete) and
    // manual-with-photo (App.Components.WorkoutCompleteModal) are visually
    // distinct completed states -- the point of the auto-detected label is
    // specifically to make it obvious when that happened (see Settings'
    // Gym Locations section for the foreground-only caveat).
    const completionSectionHtml = completed
      ? '<p class="home-complete-status' + (details.autoDetected ? ' home-complete-status--auto' : '') + '">' +
          (details.autoDetected ? '📍 Auto-completed' : '&#10003; Completed (photo verified)') +
        '</p>' +
        '<button type="button" class="btn-ghost-sm" id="home-undo-complete">Undo</button>'
      : '<button type="button" class="btn-primary home-complete-btn" id="home-mark-complete">Mark complete</button>';

    container.innerHTML =
      '<h2 class="section-title">Today&rsquo;s Workout</h2>' +
      '<p class="home-today-label">' + day.label + '</p>' +
      '<ul class="home-today-exercises">' + exerciseListHtml + '</ul>' +
      '<p class="home-today-time">~' + minutes + ' min</p>' +
      completionSectionHtml +
      '<a href="#/split-builder" class="btn-ghost-sm home-link-btn">View full split</a>';

    const markBtn = container.querySelector('#home-mark-complete');
    if (markBtn) {
      markBtn.addEventListener('click', function () {
        App.Components.WorkoutCompleteModal.open(user, todayKey, todayWd, function () {
          renderTodayWorkout(container, user, onToggle);
          onToggle();
        });
      });
    }
    const undoBtn = container.querySelector('#home-undo-complete');
    if (undoBtn) {
      undoBtn.addEventListener('click', function () {
        App.Schedule.setCompleted(user.id, todayKey, todayWd, false);
        renderTodayWorkout(container, user, onToggle);
        onToggle();
      });
    }
  }

  // Entirely computed from data already sitting in App.Storage's sync
  // cache (history, completions, streak) -- no new Supabase calls, no
  // separate storage for this at all. "This month" = the current calendar
  // month, recomputed fresh on every Home render, so it just naturally
  // updates as the month progresses.
  function computeMonthlyRecap(user) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const displayUnit = App.Storage.getSettings(user.id).displayUnit || 'kg';

    const workoutsThisMonth = App.Storage.getCompletions(user.id).filter(function (c) {
      return c.completed && App.Schedule.parseDateKey(c.date) >= monthStart;
    }).length;

    const history = App.Storage.getHistory(user.id);
    const setsThisMonth = history.filter(function (e) { return new Date(e.date) >= monthStart; }).length;

    // Biggest 1RM increase this month: for each lift, the best estimate
    // logged THIS month vs. the best logged BEFORE this month -- only
    // counts a lift that has data on both sides, so "increase" means an
    // actual improvement over a real prior baseline, not just a first-ever
    // entry read as "infinite" progress.
    const liftBuckets = {};
    history.forEach(function (e) {
      if (!liftBuckets[e.lift]) liftBuckets[e.lift] = { before: [], during: [] };
      const kg = App.Units.convert(e.estimated1RM, e.unit, 'kg');
      liftBuckets[e.lift][new Date(e.date) >= monthStart ? 'during' : 'before'].push(kg);
    });
    let biggestIncrease = null;
    Object.keys(liftBuckets).forEach(function (lift) {
      const b = liftBuckets[lift];
      if (b.before.length === 0 || b.during.length === 0) return;
      const deltaKg = Math.max.apply(null, b.during) - Math.max.apply(null, b.before);
      if (deltaKg > 0 && (!biggestIncrease || deltaKg > biggestIncrease.deltaKg)) {
        biggestIncrease = { lift: lift, deltaKg: deltaKg };
      }
    });

    return {
      monthLabel: now.toLocaleDateString(undefined, { month: 'long' }),
      workoutsThisMonth: workoutsThisMonth,
      setsThisMonth: setsThisMonth,
      streakCount: App.Storage.getStreak(user.id).count || 0,
      biggestIncrease: biggestIncrease,
      displayUnit: displayUnit,
    };
  }

  function renderMonthlyRecapCard(container, user) {
    const recap = computeMonthlyRecap(user);

    const highlightHtml = recap.biggestIncrease
      ? '📈 Biggest gain: <strong>' + escapeHtml(App.ExerciseLibrary.label(recap.biggestIncrease.lift)) + '</strong> up ' +
        App.Units.round(App.Units.convert(recap.biggestIncrease.deltaKg, 'kg', recap.displayUnit), 1) + ' ' + recap.displayUnit + ' this month'
      : 'Log a few more sets this month to see your progress highlighted here.';

    container.innerHTML =
      '<h2 class="section-title">' + recap.monthLabel + ' So Far</h2>' +
      '<div class="monthly-recap-grid">' +
        '<div class="monthly-recap-stat"><span class="monthly-recap-value">' + recap.workoutsThisMonth + '</span><span class="monthly-recap-label">Workouts</span></div>' +
        '<div class="monthly-recap-stat"><span class="monthly-recap-value">' + recap.setsThisMonth + '</span><span class="monthly-recap-label">Sets logged</span></div>' +
        '<div class="monthly-recap-stat"><span class="monthly-recap-value">' + recap.streakCount + '</span><span class="monthly-recap-label">Day streak</span></div>' +
      '</div>' +
      '<p class="monthly-recap-highlight">' + highlightHtml + '</p>';
  }

  function render(container, opts) {
    const user = opts.user;

    // Today (default) is the day-to-day action tab -- today's workout and
    // the current goal. Progress is the "how am I doing over time" tab --
    // the 1RM trend graph and the monthly recap -- hidden until tapped so
    // Home's default landing view stays focused on what to do right now
    // rather than a wall of cards. See App.Components.Tabs for the wiring.
    container.innerHTML =
      '<section class="page page-home">' +
        '<div class="page-header">' +
          '<div class="page-title-row"><h1 class="page-title">Home</h1><div id="home-streak-badge"></div></div>' +
          '<button type="button" class="home-friends-btn" id="home-friends-btn" title="Friends" aria-label="Friends">' + friendsIconSvg() + '</button>' +
        '</div>' +
        '<div id="home-quick-links"></div>' +
        '<div class="segmented-tabs" role="tablist">' +
          '<button type="button" class="segmented-tab-btn segmented-tab-btn--active" data-tab="today" role="tab" aria-selected="true">Today</button>' +
          '<button type="button" class="segmented-tab-btn" data-tab="progress" role="tab" aria-selected="false">Progress</button>' +
        '</div>' +
        '<div data-tab-panel="today">' +
          '<div class="card card--primary" id="home-today-container"></div>' +
          '<div class="card" id="home-goal-container"></div>' +
        '</div>' +
        '<div data-tab-panel="progress" hidden>' +
          '<div class="card" id="home-trend-container"></div>' +
          '<div class="card" id="home-recap-container"></div>' +
        '</div>' +
      '</section>';

    App.Components.QuickLinks.render(container.querySelector('#home-quick-links'), user, 'home');
    container.querySelector('#home-friends-btn').addEventListener('click', function () {
      App.Components.FriendsPanel.open(user);
    });
    App.Components.FriendsBadge.refresh(user);
    App.Components.Tabs.wire(container);

    const streakBadgeEl = container.querySelector('#home-streak-badge');
    const goalEl = container.querySelector('#home-goal-container');

    App.Components.StreakBadge.render(streakBadgeEl, user);
    renderMonthlyRecapCard(container.querySelector('#home-recap-container'), user);
    renderGoalCard(goalEl, user);
    renderTodayWorkout(container.querySelector('#home-today-container'), user, function () {
      App.Components.StreakBadge.render(streakBadgeEl, user);
    });
    renderTrendCard(container.querySelector('#home-trend-container'), user);
  }

  return { render };
})();
