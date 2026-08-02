window.App = window.App || {};

/**
 * Unified exercise lookup merging three sources for a given user:
 *   1. The original 22 built-in lifts (App.Standards / App.ExerciseInfo) --
 *      untouched, still the default set everyone starts with.
 *   2. Curated-pool exercises (App.ExercisePool) this user has explicitly
 *      added via the picker's search -- full data (muscles, description,
 *      pattern, standards), same as any built-in.
 *   3. This user's own custom exercises (App.Storage.getCustomExercises) --
 *      whatever they typed manually. No standards table exists for these,
 *      ever; thresholdsKg() returns null rather than fabricating one.
 *
 * Functions that just look up an already-known lift key (label/info/
 * thresholdsKg/isBodyweightLift) resolve the current user via
 * App.Auth.getCurrentUser() themselves when not given one explicitly, so
 * call sites deep inside charts/lists (History, Achievements, ProgressChart,
 * etc.) don't all need userId threaded through their own signatures --
 * they're only ever invoked on authenticated pages anyway. categories(),
 * which drives what the exercise PICKER shows, still takes userId
 * explicitly from its caller, same as any other opts field.
 */
App.ExerciseLibrary = (function () {
  function currentUserId() {
    const u = App.Auth.getCurrentUser();
    return u ? u.id : null;
  }

  function addedPoolExercises(userId) {
    if (!userId) return [];
    return App.Storage.getUserAddedExercises(userId)
      .map(function (key) { return App.ExercisePool.BY_KEY[key]; })
      .filter(Boolean);
  }

  function customExercises(userId) {
    if (!userId) return [];
    return App.Storage.getCustomExercises(userId);
  }

  function findCustom(liftKey, userId) {
    userId = userId || currentUserId();
    if (!userId) return null;
    return customExercises(userId).find(function (c) { return c.key === liftKey; }) || null;
  }

  // Categories shaped exactly like App.Standards.CATEGORIES (for the
  // picker): built-in lifts first within each muscle group, then this
  // user's added curated-pool exercises, then their custom ones.
  function categories(userId) {
    userId = userId || currentUserId();
    const merged = App.Standards.CATEGORIES.map(function (g) {
      return { label: g.label, lifts: g.lifts.slice() };
    });
    function groupFor(label) {
      return merged.find(function (g) { return g.label === label; });
    }
    addedPoolExercises(userId).forEach(function (ex) {
      const g = groupFor(ex.category);
      if (g && g.lifts.indexOf(ex.key) === -1) g.lifts.push(ex.key);
    });
    customExercises(userId).forEach(function (ex) {
      const g = groupFor(ex.primaryMuscle);
      if (g && g.lifts.indexOf(ex.key) === -1) g.lifts.push(ex.key);
    });
    return merged;
  }

  function label(liftKey, userId) {
    if (App.Standards.LIFT_LABELS[liftKey]) return App.Standards.LIFT_LABELS[liftKey];
    const pool = App.ExercisePool.BY_KEY[liftKey];
    if (pool) return pool.label;
    const custom = findCustom(liftKey, userId);
    if (custom) return custom.name;
    return liftKey;
  }

  function info(liftKey, userId) {
    const builtIn = App.ExerciseInfo.get(liftKey);
    if (builtIn) return builtIn;

    const pool = App.ExercisePool.BY_KEY[liftKey];
    if (pool) return { primary: pool.primary, secondary: pool.secondary || [], pattern: pool.pattern, description: pool.description };

    const custom = findCustom(liftKey, userId);
    if (custom) {
      return {
        primary: [custom.primaryMuscle],
        secondary: custom.secondaryMuscle ? [custom.secondaryMuscle] : [],
        pattern: custom.pattern || null,
        description: custom.description || 'A custom exercise you added — no further description provided.',
      };
    }
    return null;
  }

  function isCustom(liftKey, userId) {
    if (App.Standards.LIFT_LABELS[liftKey] || App.ExercisePool.BY_KEY[liftKey]) return false;
    return !!findCustom(liftKey, userId);
  }

  // null means "no standards data available" -- always true for custom
  // exercises, never true for built-in or curated-pool ones.
  function thresholdsKg(liftKey, sex, bodyweightKg) {
    if (App.Standards.TABLE[liftKey]) return App.Standards.getThresholdsKg(liftKey, sex, bodyweightKg);

    const pool = App.ExercisePool.BY_KEY[liftKey];
    if (pool) {
      const multipliers = pool.table[sex];
      const out = {};
      App.Standards.LEVELS.forEach(function (level) { out[level] = bodyweightKg * multipliers[level]; });
      return out;
    }
    return null;
  }

  function isBodyweightLift(liftKey) {
    if (App.Standards.isBodyweightLift(liftKey)) return true;
    const pool = App.ExercisePool.BY_KEY[liftKey];
    return !!(pool && pool.bodyweightLift);
  }

  return { categories, label, info, isCustom, thresholdsKg, isBodyweightLift };
})();
