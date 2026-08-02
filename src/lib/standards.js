window.App = window.App || {};

App.Standards = (function () {
  const LEVELS = ['untrained', 'novice', 'intermediate', 'advanced', 'elite'];

  // "weight" for these = bodyweight + added weight (0 added weight for
  // unweighted reps) -- the LiftForm swaps its input label accordingly.
  const BODYWEIGHT_LIFTS = ['pull_up', 'dip', 'hanging_leg_raise'];

  const CATEGORIES = [
    {
      label: 'Legs',
      lifts: ['squat', 'leg_press', 'romanian_deadlift', 'leg_curl', 'calf_raise', 'hip_thrust'],
    },
    {
      label: 'Back',
      lifts: ['deadlift', 'pull_up', 'lat_pulldown', 'upper_back_row', 'face_pull'],
    },
    {
      label: 'Chest',
      lifts: ['bench', 'incline_db_press', 'dip', 'machine_fly'],
    },
    {
      label: 'Shoulders',
      lifts: ['overhead_press', 'barbell_shrug'],
    },
    {
      label: 'Arms',
      lifts: ['preacher_curl', 'tricep_pushdown', 'barbell_curl'],
    },
    {
      label: 'Abs',
      lifts: ['cable_crunch', 'hanging_leg_raise'],
    },
  ];

  const LIFT_LABELS = {
    squat: 'Squat',
    bench: 'Bench Press',
    deadlift: 'Deadlift',
    overhead_press: 'Overhead Press',
    incline_db_press: 'Incline DB Press',
    pull_up: 'Pull-Up',
    dip: 'Dip',
    machine_fly: 'Machine Chest Fly',
    lat_pulldown: 'Lat Pulldown',
    upper_back_row: 'Upper Back Row',
    leg_press: 'Leg Press',
    preacher_curl: 'Preacher Curl',
    tricep_pushdown: 'Tricep Pushdown',
    romanian_deadlift: 'Romanian Deadlift',
    leg_curl: 'Leg Curl',
    calf_raise: 'Calf Raise',
    hip_thrust: 'Hip Thrust',
    cable_crunch: 'Cable Crunch',
    hanging_leg_raise: 'Hanging Leg Raise',
    face_pull: 'Face Pull',
    barbell_shrug: 'Barbell Shrug',
    barbell_curl: 'Barbell Curl',
  };

  const TABLE = {
    squat: { male: { untrained: 0.5, novice: 0.75, intermediate: 1.25, advanced: 1.75, elite: 2.25 }, female: { untrained: 0.4, novice: 0.6, intermediate: 0.9, advanced: 1.25, elite: 1.75 } },
    bench: { male: { untrained: 0.5, novice: 0.75, intermediate: 1.0, advanced: 1.5, elite: 2.0 }, female: { untrained: 0.3, novice: 0.45, intermediate: 0.6, advanced: 0.85, elite: 1.15 } },
    deadlift: { male: { untrained: 0.75, novice: 1.0, intermediate: 1.5, advanced: 2.0, elite: 2.5 }, female: { untrained: 0.5, novice: 0.75, intermediate: 1.1, advanced: 1.5, elite: 2.0 } },
    overhead_press: { male: { untrained: 0.35, novice: 0.5, intermediate: 0.75, advanced: 1.0, elite: 1.25 }, female: { untrained: 0.2, novice: 0.3, intermediate: 0.45, advanced: 0.65, elite: 0.85 } },
    incline_db_press: { male: { untrained: 0.15, novice: 0.25, intermediate: 0.35, advanced: 0.5, elite: 0.65 }, female: { untrained: 0.1, novice: 0.15, intermediate: 0.2, advanced: 0.3, elite: 0.4 } },
    pull_up: { male: { untrained: 0.8, novice: 1.0, intermediate: 1.25, advanced: 1.5, elite: 1.75 }, female: { untrained: 0.5, novice: 0.75, intermediate: 0.9, advanced: 1.1, elite: 1.3 } },
    dip: { male: { untrained: 0.9, novice: 1.1, intermediate: 1.4, advanced: 1.7, elite: 2.0 }, female: { untrained: 0.6, novice: 0.8, intermediate: 1.0, advanced: 1.2, elite: 1.4 } },
    machine_fly: { male: { untrained: 0.15, novice: 0.25, intermediate: 0.35, advanced: 0.5, elite: 0.65 }, female: { untrained: 0.1, novice: 0.15, intermediate: 0.2, advanced: 0.3, elite: 0.4 } },
    lat_pulldown: { male: { untrained: 0.5, novice: 0.65, intermediate: 0.85, advanced: 1.1, elite: 1.35 }, female: { untrained: 0.35, novice: 0.45, intermediate: 0.6, advanced: 0.8, elite: 1.0 } },
    upper_back_row: { male: { untrained: 0.4, novice: 0.6, intermediate: 0.85, advanced: 1.1, elite: 1.4 }, female: { untrained: 0.3, novice: 0.4, intermediate: 0.55, advanced: 0.75, elite: 0.95 } },
    leg_press: { male: { untrained: 1.0, novice: 1.5, intermediate: 2.0, advanced: 2.75, elite: 3.5 }, female: { untrained: 0.8, novice: 1.2, intermediate: 1.6, advanced: 2.2, elite: 2.8 } },
    preacher_curl: { male: { untrained: 0.15, novice: 0.25, intermediate: 0.35, advanced: 0.5, elite: 0.65 }, female: { untrained: 0.1, novice: 0.15, intermediate: 0.2, advanced: 0.3, elite: 0.4 } },
    tricep_pushdown: { male: { untrained: 0.2, novice: 0.3, intermediate: 0.4, advanced: 0.55, elite: 0.7 }, female: { untrained: 0.12, novice: 0.18, intermediate: 0.25, advanced: 0.35, elite: 0.45 } },
    romanian_deadlift: { male: { untrained: 0.5, novice: 0.75, intermediate: 1.1, advanced: 1.5, elite: 1.9 }, female: { untrained: 0.35, novice: 0.55, intermediate: 0.8, advanced: 1.1, elite: 1.4 } },
    leg_curl: { male: { untrained: 0.2, novice: 0.3, intermediate: 0.45, advanced: 0.65, elite: 0.85 }, female: { untrained: 0.15, novice: 0.22, intermediate: 0.32, advanced: 0.45, elite: 0.6 } },
    calf_raise: { male: { untrained: 0.75, novice: 1.1, intermediate: 1.5, advanced: 2.0, elite: 2.5 }, female: { untrained: 0.5, novice: 0.75, intermediate: 1.0, advanced: 1.4, elite: 1.8 } },
    hip_thrust: { male: { untrained: 0.75, novice: 1.25, intermediate: 1.75, advanced: 2.5, elite: 3.0 }, female: { untrained: 0.6, novice: 1.0, intermediate: 1.5, advanced: 2.0, elite: 2.5 } },
    cable_crunch: { male: { untrained: 0.2, novice: 0.35, intermediate: 0.5, advanced: 0.7, elite: 0.9 }, female: { untrained: 0.15, novice: 0.25, intermediate: 0.35, advanced: 0.5, elite: 0.65 } },
    hanging_leg_raise: { male: { untrained: 0.5, novice: 0.65, intermediate: 0.85, advanced: 1.05, elite: 1.3 }, female: { untrained: 0.35, novice: 0.5, intermediate: 0.65, advanced: 0.85, elite: 1.05 } },
    face_pull: { male: { untrained: 0.12, novice: 0.2, intermediate: 0.28, advanced: 0.4, elite: 0.5 }, female: { untrained: 0.08, novice: 0.13, intermediate: 0.18, advanced: 0.25, elite: 0.32 } },
    barbell_shrug: { male: { untrained: 0.6, novice: 0.9, intermediate: 1.25, advanced: 1.75, elite: 2.25 }, female: { untrained: 0.4, novice: 0.6, intermediate: 0.85, advanced: 1.2, elite: 1.5 } },
    barbell_curl: { male: { untrained: 0.2, novice: 0.3, intermediate: 0.42, advanced: 0.58, elite: 0.75 }, female: { untrained: 0.12, novice: 0.18, intermediate: 0.26, advanced: 0.36, elite: 0.46 } },
  };

  function getThresholdsKg(lift, sex, bodyweightKg) {
    const multipliers = TABLE[lift][sex];
    const thresholds = {};
    LEVELS.forEach((level) => {
      thresholds[level] = bodyweightKg * multipliers[level];
    });
    return thresholds;
  }

  // Returns the level key the lift falls in, or 'below_untrained'.
  function rank(oneRmKg, thresholdsKg) {
    if (oneRmKg < thresholdsKg.untrained) return 'below_untrained';
    let level = LEVELS[0];
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (oneRmKg >= thresholdsKg[LEVELS[i]]) {
        level = LEVELS[i];
        break;
      }
    }
    return level;
  }

  function isBodyweightLift(lift) {
    return BODYWEIGHT_LIFTS.indexOf(lift) !== -1;
  }

  return { TABLE, LEVELS, LIFT_LABELS, CATEGORIES, BODYWEIGHT_LIFTS, isBodyweightLift, getThresholdsKg, rank };
})();
