window.App = window.App || {};

/**
 * Shared goal-achievement check, callable from anywhere a relevant value
 * gets logged (Home's quick bodyweight log, OneRepMax's log-a-set, Split
 * Builder's questionnaire) so the celebration fires the moment a goal is
 * hit regardless of which page did the logging, not just when Home happens
 * to re-render. Also archives the achieved goal into permanent per-user
 * achievement history with a computed medal tier.
 */
App.Goals = (function () {
  const MEDAL_TIERS = ['novice', 'intermediate', 'advanced', 'elite'];

  function latestBodyweightEntry(userId) {
    const log = App.Storage.getBodyweightLog(userId);
    if (log.length === 0) return null;
    return log.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); })[0];
  }

  function latestEntryForLift(userId, lift) {
    const history = App.Storage.getHistory(userId).filter(function (e) { return e.lift === lift; });
    if (history.length === 0) return null;
    return history.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); })[0];
  }

  // First-ever logged value for this lift, in `unit` -- the same "starting
  // point" Home's goal progress chart uses, so the archived achievement's
  // starting value matches what the user watched progress from.
  function earliestValueForLift(userId, lift, unit) {
    const history = App.Storage.getHistory(userId).filter(function (e) { return e.lift === lift; });
    if (history.length === 0) return null;
    const earliest = history.slice().sort(function (a, b) { return new Date(a.date) - new Date(b.date); })[0];
    return App.Units.convert(earliest.estimated1RM, earliest.unit, unit);
  }

  function isReached(goal, latestValue) {
    if (goal.type === 'bodyweight') {
      return goal.direction === 'lose' ? latestValue <= goal.targetWeight : latestValue >= goal.targetWeight;
    }
    return latestValue >= goal.targetWeight;
  }

  // Exercise medal: whichever standards rank the achieved 1RM lands in for
  // that lift/bodyweight/sex (same table behind the standards gauge),
  // floored at Novice -- hitting the goal at all guarantees at least the
  // lowest medal even if the standards table would otherwise call it
  // "untrained"/"below_untrained".
  function exerciseMedalTier(entry) {
    const bodyweightKg = App.Units.convert(entry.bodyweight, entry.unit, 'kg');
    const oneRmKg = App.Units.convert(entry.estimated1RM, entry.unit, 'kg');
    const thresholds = App.Standards.getThresholdsKg(entry.lift, entry.sex, bodyweightKg);
    const rank = App.Standards.rank(oneRmKg, thresholds);
    return MEDAL_TIERS.indexOf(rank) !== -1 ? rank : 'novice';
  }

  // Bodyweight medal: fixed thresholds by total amount changed, regardless
  // of direction (losing or gaining), always evaluated in kg.
  function bodyweightMedalTier(goal) {
    const amountKg = App.Units.convert(goal.amount, goal.unit, 'kg');
    if (amountKg >= 10) return 'elite';
    if (amountKg >= 6) return 'advanced';
    if (amountKg >= 3) return 'intermediate';
    return 'novice';
  }

  function makeId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'ach_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  // Refresh the nav immediately so the "Achievements" link appears the
  // moment a goal is reached, even if the user never navigates away from
  // the page they logged on (the router otherwise only re-renders the
  // navbar on a hashchange, which nothing here triggers on its own).
  function refreshNavbar() {
    if (App.Router && typeof App.Router.refreshNavbar === 'function') {
      App.Router.refreshNavbar();
    }
  }

  function buildAchievementRecord(userId, goal, tier) {
    return {
      id: makeId(),
      type: goal.type,
      lift: goal.type === 'exercise' ? goal.lift : null,
      direction: goal.type === 'bodyweight' ? goal.direction : null,
      startValue: goal.type === 'bodyweight' ? goal.startWeight : earliestValueForLift(userId, goal.lift, goal.unit),
      targetValue: goal.targetWeight,
      amount: goal.type === 'bodyweight' ? goal.amount : null,
      unit: goal.unit,
      achievedAt: goal.achievedAt || new Date().toISOString(),
      tier: tier,
    };
  }

  /**
   * Call after logging a bodyweight entry or a new 1RM set. Idempotent --
   * once a goal's `achieved` flag is set this is a no-op, so calling it
   * after every log action never re-fires the celebration or double-
   * archives it. Returns the updated goal if it was JUST newly marked
   * achieved (so the caller can trigger the celebration), or null otherwise
   * (no active goal, not reached yet, or already celebrated).
   */
  function checkAchievement(userId) {
    const goal = App.Storage.getGoal(userId);
    if (!goal || goal.achieved) return null;

    let latestValue, matchedEntry;
    if (goal.type === 'bodyweight') {
      const bwEntry = latestBodyweightEntry(userId);
      if (!bwEntry) return null;
      latestValue = App.Units.convert(bwEntry.weight, bwEntry.unit, goal.unit);
    } else {
      matchedEntry = latestEntryForLift(userId, goal.lift);
      if (!matchedEntry) return null;
      latestValue = App.Units.convert(matchedEntry.estimated1RM, matchedEntry.unit, goal.unit);
    }
    if (!isReached(goal, latestValue)) {
      console.log('[Goals] checkAchievement: goal not yet reached', { goal: goal, latestValue: latestValue });
      return null;
    }

    const tier = goal.type === 'bodyweight' ? bodyweightMedalTier(goal) : exerciseMedalTier(matchedEntry);

    goal.achieved = true;
    goal.achievedAt = new Date().toISOString();
    App.Storage.saveGoal(userId, goal);

    const achievement = buildAchievementRecord(userId, goal, tier);
    App.Storage.addAchievement(userId, achievement);
    console.log('[Goals] checkAchievement: goal reached, archived achievement', achievement);
    console.log('[Goals] achievements now in storage:', App.Storage.getAchievements(userId));

    refreshNavbar();

    return goal;
  }

  /**
   * Self-heals a specific gap: a goal that's marked `achieved: true` but has
   * no matching record in the achievements archive. This happens for any
   * goal that was marked achieved before archiving existed, or if archiving
   * ever fails partway -- without this, such a goal is permanently invisible
   * (checkAchievement short-circuits on `goal.achieved` and never runs the
   * archiving step again). Cheap no-op when everything's already in sync,
   * so it's safe to call on every relevant page load.
   */
  function ensureArchived(userId) {
    const goal = App.Storage.getGoal(userId);
    if (!goal || !goal.achieved) return;

    const achievements = App.Storage.getAchievements(userId);
    const alreadyArchived = achievements.some(function (a) {
      return a.achievedAt === goal.achievedAt && a.type === goal.type &&
        (goal.type === 'exercise' ? a.lift === goal.lift : true);
    });
    if (alreadyArchived) return;

    console.log('[Goals] ensureArchived: found an achieved goal with no archive record, backfilling', goal);

    let tier;
    if (goal.type === 'bodyweight') {
      tier = bodyweightMedalTier(goal);
    } else {
      const matchedEntry = latestEntryForLift(userId, goal.lift);
      tier = matchedEntry ? exerciseMedalTier(matchedEntry) : 'novice';
    }

    const achievement = buildAchievementRecord(userId, goal, tier);
    App.Storage.addAchievement(userId, achievement);
    console.log('[Goals] ensureArchived: backfilled achievement', achievement);
  }

  return { checkAchievement, ensureArchived, isReached, MEDAL_TIERS };
})();
