window.App = window.App || {};

App.ExerciseInfo = (function () {
  const DATA = {
    squat: { primary: ['Quads', 'Glutes'], secondary: ['Hamstrings', 'Core', 'Lower back'], pattern: 'squat', description: 'A foundational lower-body compound lift that loads the quads and glutes through a full range of motion while demanding total-body stability.' },
    bench: { primary: ['Chest'], secondary: ['Front shoulders', 'Triceps'], pattern: 'horizontal_push', description: 'The classic horizontal press — builds chest mass and pressing strength, with real assistance from the shoulders and triceps.' },
    deadlift: { primary: ['Hamstrings', 'Glutes', 'Lower back'], secondary: ['Traps', 'Forearms', 'Core'], pattern: 'hinge', description: 'A hip-hinge movement that trains the entire posterior chain in one lift — arguably the most total-body compound exercise there is.' },
    overhead_press: { primary: ['Shoulders'], secondary: ['Triceps', 'Upper chest', 'Core'], pattern: 'vertical_push', description: 'A standing vertical press that builds shoulder strength and size while forcing the core to stabilize the whole lift.' },
    incline_db_press: { primary: ['Upper chest'], secondary: ['Shoulders', 'Triceps'], pattern: 'horizontal_push', description: 'An angled dumbbell press that shifts emphasis onto the upper chest, with a longer stretch than a flat bench press.' },
    pull_up: { primary: ['Lats'], secondary: ['Biceps', 'Rear shoulders', 'Grip'], pattern: 'vertical_pull', description: "A bodyweight vertical pull that's one of the best builders of back width and grip/pulling strength." },
    dip: { primary: ['Chest', 'Triceps'], secondary: ['Shoulders'], pattern: 'horizontal_push', description: 'A bodyweight press that hits the lower chest and triceps hard, with load easily added via a belt.' },
    machine_fly: { primary: ['Chest'], secondary: ['Front shoulders'], pattern: 'horizontal_push', description: 'An isolation move that stretches and squeezes the chest without triceps/shoulder assistance carrying the load.' },
    lat_pulldown: { primary: ['Lats'], secondary: ['Biceps', 'Upper back'], pattern: 'vertical_pull', description: 'A machine-based vertical pull that trains the same pattern as a pull-up with adjustable load, good for building toward one.' },
    upper_back_row: { primary: ['Mid-back', 'Lats'], secondary: ['Biceps', 'Rear shoulders'], pattern: 'horizontal_pull', description: 'A horizontal pulling movement that builds back thickness and postural strength, pairing well with pressing work.' },
    leg_press: { primary: ['Quads', 'Glutes'], secondary: ['Hamstrings'], pattern: 'squat', description: 'A machine-supported squat pattern that allows heavy quad/glute loading with less stabilizer demand than a free-standing squat.' },
    preacher_curl: { primary: ['Biceps'], secondary: [], pattern: 'isolation_curl', description: 'A single-joint isolation move that locks the upper arm in place to fully isolate the biceps.' },
    tricep_pushdown: { primary: ['Triceps'], secondary: [], pattern: 'isolation_extension', description: 'A cable isolation move that targets the triceps directly, with the shoulder held fixed throughout.' },
    romanian_deadlift: { primary: ['Hamstrings', 'Glutes'], secondary: ['Lower back', 'Core'], pattern: 'hinge', description: 'A stiffer-legged hip hinge that emphasizes the hamstrings and glutes through a deep stretch, without resetting the bar on the floor between reps.' },
    leg_curl: { primary: ['Hamstrings'], secondary: [], pattern: 'leg_curl', description: 'A machine isolation move that flexes the knee to target the hamstrings directly, without the hips or lower back sharing the load.' },
    calf_raise: { primary: ['Calves'], secondary: [], pattern: 'calf_raise', description: 'A simple ankle-extension move that isolates the calves — high reps and heavy loads are normal since the calves are built for endurance.' },
    hip_thrust: { primary: ['Glutes'], secondary: ['Hamstrings'], pattern: 'hip_thrust', description: 'A hip-extension move with the upper back braced on a bench that loads the glutes harder than almost anything else in the gym.' },
    cable_crunch: { primary: ['Abs'], secondary: [], pattern: 'core', description: 'A kneeling cable crunch that flexes the spine against resistance, adding load to a bodyweight ab movement.' },
    hanging_leg_raise: { primary: ['Abs'], secondary: ['Hip flexors', 'Grip'], pattern: 'core', description: 'A hanging core move that lifts the legs by flexing the hips and curling the pelvis, with grip and shoulders working to keep you stable.' },
    face_pull: { primary: ['Rear shoulders'], secondary: ['Upper back', 'Traps'], pattern: 'horizontal_pull', description: 'A cable pull to the face that targets the rear delts and upper back — a staple for shoulder health and posture.' },
    barbell_shrug: { primary: ['Traps'], secondary: ['Forearms', 'Grip'], pattern: 'shrug', description: 'A vertical shoulder shrug under a loaded bar that isolates the traps, which can typically handle very heavy weight.' },
    barbell_curl: { primary: ['Biceps'], secondary: ['Forearms'], pattern: 'isolation_curl', description: 'A standing barbell curl that builds the biceps through a full range of motion, using a bit more body english than a preacher curl.' },
  };

  function get(liftKey) {
    return DATA[liftKey] || null;
  }

  return { DATA, get };
})();
