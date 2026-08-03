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

  // Profile card: avatar (uploaded photo or preset), name/age/bodyweight,
  // current streak, up to 3 most-recent earned medals overlapping the
  // avatar's lower edge (the whole cluster links to the full Achievements
  // list), and an edit pencil opening ProfileEditModal. The profile itself
  // is guaranteed to exist by the time Home ever renders -- router.js
  // redirects to the mandatory setup flow otherwise.
  function renderProfileCard(container, user) {
    const profile = App.Storage.getProfile(user.id);
    const streak = App.Storage.getStreak(user.id);
    const achievements = App.Storage.getAchievements(user.id)
      .slice()
      .sort(function (a, b) { return new Date(b.achievedAt) - new Date(a.achievedAt); });
    const recentMedals = achievements.slice(0, 3);

    const displayUnit = App.Storage.getSettings(user.id).displayUnit || profile.bodyweightUnit || 'kg';
    const bwText = profile.bodyweight != null
      ? App.Units.round(App.Units.convert(profile.bodyweight, profile.bodyweightUnit || 'kg', displayUnit), 1) + ' ' + displayUnit
      : null;
    const metaParts = [];
    if (profile.age) metaParts.push(profile.age + ' yrs');
    if (bwText) metaParts.push(bwText);

    const avatarHtml = (profile.profilePictureType === 'preset' && profile.presetAvatarId)
      ? App.Components.PresetAvatars.render(profile.presetAvatarId)
      : '<div class="profile-avatar-empty"></div>';

    const medalsHtml = recentMedals.length
      ? '<a href="#/achievements" class="profile-medals" aria-label="View all earned medals">' +
          recentMedals.map(function (a) { return '<span class="profile-medal">' + App.Components.MedalIcon.render(a.tier) + '</span>'; }).join('') +
        '</a>'
      : '';

    container.innerHTML =
      '<div class="profile-card-inner">' +
        '<div class="profile-avatar-wrap">' +
          '<div class="profile-avatar" id="profile-avatar-slot">' + avatarHtml + '</div>' +
          medalsHtml +
        '</div>' +
        '<div class="profile-info">' +
          '<p class="profile-name">' + (profile.name ? escapeHtml(profile.name) : '') + '</p>' +
          (metaParts.length ? '<p class="profile-meta">' + metaParts.join(' &middot; ') + '</p>' : '') +
          '<p class="profile-streak">' + App.Components.StreakIcon.render(streak.count || 0) + '<span>' + (streak.count || 0) + ' day streak</span></p>' +
        '</div>' +
        '<button type="button" class="profile-edit-btn" id="profile-edit-btn" aria-label="Edit profile">&#9998;</button>' +
      '</div>';

    if (profile.profilePictureType === 'upload' && profile.profilePictureUrl) {
      App.Storage.getProfilePhotoUrl(profile.profilePictureUrl).then(function (url) {
        if (!url) return;
        const slot = container.querySelector('#profile-avatar-slot');
        if (slot) slot.innerHTML = '<img src="' + url + '" alt="Profile photo" />';
      });
    }

    container.querySelector('#profile-edit-btn').addEventListener('click', function () {
      App.Components.ProfileEditModal.open(user, function () { renderProfileCard(container, user); });
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

    const completed = App.Schedule.isCompleted(user.id, todayKey);
    const minutes = App.SplitBuilder.estimateMinutes(day.exercises);
    const exerciseListHtml = day.exercises.map(function (ex) {
      return '<li>' + App.ExerciseLibrary.label(ex.lift) + '</li>';
    }).join('');

    container.innerHTML =
      '<h2 class="section-title">Today&rsquo;s Workout</h2>' +
      '<p class="home-today-label">' + day.label + '</p>' +
      '<ul class="home-today-exercises">' + exerciseListHtml + '</ul>' +
      '<p class="home-today-time">~' + minutes + ' min</p>' +
      '<button type="button" class="btn-primary home-complete-btn' + (completed ? ' home-complete-btn--done' : '') + '" id="home-mark-complete">' +
        (completed ? '&#10003; Completed' : 'Mark complete') +
      '</button>' +
      '<a href="#/split-builder" class="btn-ghost-sm home-link-btn">View full split</a>';

    container.querySelector('#home-mark-complete').addEventListener('click', function () {
      const nowCompleted = !App.Schedule.isCompleted(user.id, todayKey);
      App.Schedule.setCompleted(user.id, todayKey, todayWd, nowCompleted);
      const btn = container.querySelector('#home-mark-complete');
      btn.classList.toggle('home-complete-btn--done', nowCompleted);
      btn.innerHTML = nowCompleted ? '&#10003; Completed' : 'Mark complete';
      onToggle();
    });
  }

  function render(container, opts) {
    const user = opts.user;

    container.innerHTML =
      '<section class="page page-home">' +
        '<div class="page-header">' +
          '<div class="page-title-row"><h1 class="page-title">Home</h1><div id="home-streak-badge"></div></div>' +
          '<button type="button" class="home-friends-btn" id="home-friends-btn" title="Friends" aria-label="Friends">' + friendsIconSvg() + '</button>' +
        '</div>' +
        '<div id="home-quick-links"></div>' +
        '<div class="card profile-card" id="home-profile-container"></div>' +
        '<div class="card" id="home-goal-container"></div>' +
        '<div class="card" id="home-today-container"></div>' +
        '<div class="card" id="home-trend-container"></div>' +
      '</section>';

    App.Components.QuickLinks.render(container.querySelector('#home-quick-links'), user, 'home');
    container.querySelector('#home-friends-btn').addEventListener('click', function () {
      App.Components.FriendsPanel.open(user);
    });
    App.Components.FriendsBadge.refresh(user);

    const streakBadgeEl = container.querySelector('#home-streak-badge');
    const goalEl = container.querySelector('#home-goal-container');

    App.Components.StreakBadge.render(streakBadgeEl, user);
    renderProfileCard(container.querySelector('#home-profile-container'), user);
    renderGoalCard(goalEl, user);
    renderTodayWorkout(container.querySelector('#home-today-container'), user, function () {
      App.Components.StreakBadge.render(streakBadgeEl, user);
    });
    renderTrendCard(container.querySelector('#home-trend-container'), user);
  }

  return { render };
})();
