window.App = window.App || {};

/**
 * Rule-based weekly split generator -- no AI call, just a fixed lookup from
 * days/week to a day structure, a fixed exercise pool per movement bucket
 * (compounds listed before isolation work within each bucket), and a fixed
 * sets/reps table by experience level. This is a general-purpose template,
 * not personalized coaching -- the page surfaces that framing next to the
 * output, same spirit as the standards-table disclaimer elsewhere in the app.
 */
App.SplitBuilder = (function () {
  const MIN_PER_EXERCISE = 7; // generation-time heuristic only: how many exercises to seed a day with
  const WARMUP_MIN = 5;
  const MIN_EXERCISES = 3;

  const WORKING_SET_SECONDS = 45; // fixed, not user-editable
  const DEFAULT_REST_COMPOUND = 90;
  const DEFAULT_REST_ISOLATION = 60;

  // Every exercise lives in exactly one bucket; compounds are listed first
  // within each bucket so "favor compounds first" falls out of list order.
  const BUCKET_EXERCISES = {
    legs: ['squat', 'leg_press', 'romanian_deadlift', 'hip_thrust', 'leg_curl', 'calf_raise'],
    pull: ['deadlift', 'pull_up', 'lat_pulldown', 'upper_back_row', 'barbell_curl', 'preacher_curl', 'face_pull', 'barbell_shrug'],
    push: ['bench', 'incline_db_press', 'dip', 'overhead_press', 'machine_fly', 'tricep_pushdown'],
    abs: ['cable_crunch', 'hanging_leg_raise'],
  };

  const COMPOUND = {
    squat: true, leg_press: true, romanian_deadlift: true, hip_thrust: true,
    deadlift: true, pull_up: true, lat_pulldown: true, upper_back_row: true,
    bench: true, incline_db_press: true, dip: true, overhead_press: true,
  };

  const BUCKET_LABELS = {
    legs: 'Legs',
    pull: 'Pull (back, biceps)',
    push: 'Push (chest, shoulders, triceps)',
    abs: 'Abs',
  };

  // 0 = Monday ... 6 = Sunday. Fixed weekday assignment per days/week so a
  // generated split always lands on real calendar days, not just "Day 1/2".
  const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const WEEKDAY_ASSIGNMENTS = {
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 3, 4],
    6: [0, 1, 2, 3, 4, 5],
  };

  function weekdaysForDaysPerWeek(daysPerWeek) {
    return WEEKDAY_ASSIGNMENTS[daysPerWeek] || WEEKDAY_ASSIGNMENTS[3];
  }

  const SETS_REPS = {
    beginner: { compound: { sets: 3, reps: '10' }, isolation: { sets: 2, reps: '12' } },
    intermediate: { compound: { sets: 4, reps: '8' }, isolation: { sets: 3, reps: '12' } },
    advanced: { compound: { sets: 5, reps: '5' }, isolation: { sets: 3, reps: '10-12' } },
  };

  function isCompound(lift) {
    return !!COMPOUND[lift];
  }

  function getSetsReps(lift, experience) {
    const table = SETS_REPS[experience] || SETS_REPS.beginner;
    return isCompound(lift) ? table.compound : table.isolation;
  }

  function getDefaultRestSeconds(lift) {
    return isCompound(lift) ? DEFAULT_REST_COMPOUND : DEFAULT_REST_ISOLATION;
  }

  // Rotates the compound sub-list and isolation sub-list independently (so
  // "compounds first" is preserved) by an amount tied to the day variant,
  // giving A/B (or PPL x2) days some real exercise variety where the pool
  // is large enough to support it.
  function rotateWithinType(lifts, variantIndex) {
    const compounds = lifts.filter(isCompound);
    const isolations = lifts.filter((l) => !isCompound(l));
    function rot(arr) {
      if (arr.length < 2) return arr.slice();
      const offset = variantIndex % arr.length;
      return arr.slice(offset).concat(arr.slice(0, offset));
    }
    return rot(compounds).concat(rot(isolations));
  }

  // Round-robins across the day's buckets (one candidate per bucket per
  // round), so multi-bucket days (Upper, Full Body) get balanced coverage
  // rather than one bucket's compounds crowding out the rest.
  function pickExercisesForDay(buckets, count, variantIndex) {
    const pools = buckets.map((b) => rotateWithinType(BUCKET_EXERCISES[b] || [], variantIndex));
    const picked = [];
    const used = {};
    const maxRounds = Math.max.apply(null, pools.map((p) => p.length).concat([1]));
    for (let round = 0; round < maxRounds && picked.length < count; round++) {
      for (let i = 0; i < pools.length && picked.length < count; i++) {
        const candidate = pools[i][round];
        if (candidate && !used[candidate]) {
          picked.push(candidate);
          used[candidate] = true;
        }
      }
    }
    return picked;
  }

  function exercisesPerDayFromTime(minutes) {
    const workMinutes = Math.max(minutes - WARMUP_MIN, 0);
    return Math.max(Math.floor(workMinutes / MIN_PER_EXERCISE), MIN_EXERCISES);
  }

  // Live estimate: sum over all exercises of sets x (fixed working-set
  // duration + that exercise's current rest), plus a fixed warm-up buffer.
  // Pulls sets/rest from whatever the user currently has set, so editing
  // either one immediately changes the total -- nothing here is cached from
  // generation time.
  function estimateMinutes(exercises) {
    const workSeconds = exercises.reduce(function (total, ex) {
      const sets = Math.max(parseInt(ex.sets, 10) || 0, 0);
      const rest = Math.max(parseInt(ex.restSeconds, 10) || 0, 0);
      return total + sets * (WORKING_SET_SECONDS + rest);
    }, 0);
    return Math.round((workSeconds + WARMUP_MIN * 60) / 60);
  }

  function structureForDays(daysPerWeek) {
    switch (daysPerWeek) {
      case 2:
        return [
          { label: 'Full Body A', buckets: ['legs', 'push', 'pull'], variant: 0 },
          { label: 'Full Body B', buckets: ['legs', 'pull', 'push'], variant: 1 },
        ];
      case 3:
        return [0, 1, 2].map((i) => ({ label: 'Full Body ' + (i + 1), buckets: ['legs', 'push', 'pull'], variant: i }));
      case 4:
        return [
          { label: 'Upper A', buckets: ['push', 'pull'], variant: 0 },
          { label: 'Lower A', buckets: ['legs', 'abs'], variant: 0 },
          { label: 'Upper B', buckets: ['push', 'pull'], variant: 1 },
          { label: 'Lower B', buckets: ['legs', 'abs'], variant: 1 },
        ];
      case 5:
        return [
          { label: 'Push', buckets: ['push'], variant: 0 },
          { label: 'Pull', buckets: ['pull'], variant: 0 },
          { label: 'Legs', buckets: ['legs', 'abs'], variant: 0 },
          { label: 'Upper', buckets: ['push', 'pull'], variant: 1 },
          { label: 'Lower', buckets: ['legs', 'abs'], variant: 1 },
        ];
      case 6:
        return [
          { label: 'Push A', buckets: ['push'], variant: 0 },
          { label: 'Pull A', buckets: ['pull'], variant: 0 },
          { label: 'Legs A', buckets: ['legs', 'abs'], variant: 0 },
          { label: 'Push B', buckets: ['push'], variant: 1 },
          { label: 'Pull B', buckets: ['pull'], variant: 1 },
          { label: 'Legs B', buckets: ['legs', 'abs'], variant: 1 },
        ];
      default:
        return structureForDays(3);
    }
  }

  function buildSplit(profile) {
    const structure = structureForDays(profile.daysPerWeek);
    const perDayCount = exercisesPerDayFromTime(profile.timePerSession);
    // Use the user's actual chosen training days, in chronological order
    // through the week, rather than auto-spacing (Mon/Wed/Fri etc) --
    // structureForDays only determines which day *labels* (Upper A, Lower A,
    // ...) exist for this many days, not which weekdays they land on.
    const weekdays = (profile.trainingWeekdays && profile.trainingWeekdays.length === structure.length)
      ? profile.trainingWeekdays.slice().sort(function (a, b) { return a - b; })
      : weekdaysForDaysPerWeek(profile.daysPerWeek);
    const days = structure.map((day, i) => {
      const lifts = pickExercisesForDay(day.buckets, perDayCount, day.variant);
      const exercises = lifts.map((lift) => {
        const sr = getSetsReps(lift, profile.experienceLevel);
        return { lift: lift, sets: sr.sets, reps: sr.reps, restSeconds: getDefaultRestSeconds(lift) };
      });
      return { label: day.label, buckets: day.buckets, exercises: exercises, weekday: weekdays[i] };
    });
    return { generatedAt: new Date().toISOString(), days: days };
  }

  return {
    buildSplit,
    getSetsReps,
    getDefaultRestSeconds,
    estimateMinutes,
    exercisesPerDayFromTime,
    weekdaysForDaysPerWeek,
    BUCKET_EXERCISES,
    BUCKET_LABELS,
    WEEKDAY_NAMES,
    isCompound,
    REST_PRESETS: [30, 60, 90, 120, 180],
  };
})();
