window.App = window.App || {};

/**
 * Curated pool of ~110 additional common gym exercises, beyond the
 * original 22 hand-picked ones in standards.js -- same exact data shape
 * (category, primary/secondary muscles, description, movement pattern,
 * male/female 5-level standards multipliers), just kept in its own file so
 * nothing about the original 22 (already relied on by the standards gauge,
 * split generator, etc.) has to change.
 *
 * A user never sees any of this until they explicitly search for and add
 * one via the exercise picker (see App.Storage.getUserAddedExercises) --
 * this file is just the reference data, not anything shown by default.
 *
 * Multiplier tables are grouped into reusable PROFILES per movement
 * archetype (a heavy barbell hinge, a light isolation curl, etc.), each
 * one modeled on the closest equivalent already in standards.js, rather
 * than 110 independently invented number sets -- keeps new entries
 * consistent with each other and with the original 22, which is what
 * actually matters for a relative ranking system like this one.
 */
App.ExercisePool = (function () {
  const PROFILES = {
    SQUAT_HEAVY: { male: { untrained: 0.5, novice: 0.75, intermediate: 1.25, advanced: 1.75, elite: 2.25 }, female: { untrained: 0.4, novice: 0.6, intermediate: 0.9, advanced: 1.25, elite: 1.75 } },
    HINGE_HEAVY: { male: { untrained: 0.75, novice: 1.0, intermediate: 1.5, advanced: 2.0, elite: 2.5 }, female: { untrained: 0.5, novice: 0.75, intermediate: 1.1, advanced: 1.5, elite: 2.0 } },
    HINGE_MODERATE: { male: { untrained: 0.5, novice: 0.75, intermediate: 1.1, advanced: 1.5, elite: 1.9 }, female: { untrained: 0.35, novice: 0.55, intermediate: 0.8, advanced: 1.1, elite: 1.4 } },
    PRESS_MODERATE: { male: { untrained: 0.5, novice: 0.75, intermediate: 1.0, advanced: 1.5, elite: 2.0 }, female: { untrained: 0.3, novice: 0.45, intermediate: 0.6, advanced: 0.85, elite: 1.15 } },
    PRESS_LIGHT: { male: { untrained: 0.35, novice: 0.5, intermediate: 0.75, advanced: 1.0, elite: 1.25 }, female: { untrained: 0.2, novice: 0.3, intermediate: 0.45, advanced: 0.65, elite: 0.85 } },
    PRESS_DB: { male: { untrained: 0.15, novice: 0.25, intermediate: 0.35, advanced: 0.5, elite: 0.65 }, female: { untrained: 0.1, novice: 0.15, intermediate: 0.2, advanced: 0.3, elite: 0.4 } },
    LEG_PRESS_HEAVY: { male: { untrained: 1.0, novice: 1.5, intermediate: 2.0, advanced: 2.75, elite: 3.5 }, female: { untrained: 0.8, novice: 1.2, intermediate: 1.6, advanced: 2.2, elite: 2.8 } },
    BW_PULL: { male: { untrained: 0.8, novice: 1.0, intermediate: 1.25, advanced: 1.5, elite: 1.75 }, female: { untrained: 0.5, novice: 0.75, intermediate: 0.9, advanced: 1.1, elite: 1.3 } },
    BW_PRESS: { male: { untrained: 0.9, novice: 1.1, intermediate: 1.4, advanced: 1.7, elite: 2.0 }, female: { untrained: 0.6, novice: 0.8, intermediate: 1.0, advanced: 1.2, elite: 1.4 } },
    ROW_MODERATE: { male: { untrained: 0.4, novice: 0.6, intermediate: 0.85, advanced: 1.1, elite: 1.4 }, female: { untrained: 0.3, novice: 0.4, intermediate: 0.55, advanced: 0.75, elite: 0.95 } },
    ROW_HEAVY: { male: { untrained: 0.55, novice: 0.8, intermediate: 1.1, advanced: 1.5, elite: 1.9 }, female: { untrained: 0.4, novice: 0.55, intermediate: 0.75, advanced: 1.0, elite: 1.3 } },
    PULLDOWN_LIGHT: { male: { untrained: 0.5, novice: 0.65, intermediate: 0.85, advanced: 1.1, elite: 1.35 }, female: { untrained: 0.35, novice: 0.45, intermediate: 0.6, advanced: 0.8, elite: 1.0 } },
    ISO_ARM_SMALL: { male: { untrained: 0.15, novice: 0.25, intermediate: 0.35, advanced: 0.5, elite: 0.65 }, female: { untrained: 0.1, novice: 0.15, intermediate: 0.2, advanced: 0.3, elite: 0.4 } },
    ISO_ARM_MED: { male: { untrained: 0.2, novice: 0.3, intermediate: 0.42, advanced: 0.58, elite: 0.75 }, female: { untrained: 0.12, novice: 0.18, intermediate: 0.26, advanced: 0.36, elite: 0.46 } },
    ISO_LEG: { male: { untrained: 0.2, novice: 0.3, intermediate: 0.45, advanced: 0.65, elite: 0.85 }, female: { untrained: 0.15, novice: 0.22, intermediate: 0.32, advanced: 0.45, elite: 0.6 } },
    CALF_HEAVY: { male: { untrained: 0.75, novice: 1.1, intermediate: 1.5, advanced: 2.0, elite: 2.5 }, female: { untrained: 0.5, novice: 0.75, intermediate: 1.0, advanced: 1.4, elite: 1.8 } },
    HIP_HEAVY: { male: { untrained: 0.75, novice: 1.25, intermediate: 1.75, advanced: 2.5, elite: 3.0 }, female: { untrained: 0.6, novice: 1.0, intermediate: 1.5, advanced: 2.0, elite: 2.5 } },
    ABS_LOADED: { male: { untrained: 0.2, novice: 0.35, intermediate: 0.5, advanced: 0.7, elite: 0.9 }, female: { untrained: 0.15, novice: 0.25, intermediate: 0.35, advanced: 0.5, elite: 0.65 } },
    ABS_BW: { male: { untrained: 0.5, novice: 0.65, intermediate: 0.85, advanced: 1.05, elite: 1.3 }, female: { untrained: 0.35, novice: 0.5, intermediate: 0.65, advanced: 0.85, elite: 1.05 } },
    SHRUG_HEAVY: { male: { untrained: 0.6, novice: 0.9, intermediate: 1.25, advanced: 1.75, elite: 2.25 }, female: { untrained: 0.4, novice: 0.6, intermediate: 0.85, advanced: 1.2, elite: 1.5 } },
    REAR_DELT_LIGHT: { male: { untrained: 0.12, novice: 0.2, intermediate: 0.28, advanced: 0.4, elite: 0.5 }, female: { untrained: 0.08, novice: 0.13, intermediate: 0.18, advanced: 0.25, elite: 0.32 } },
    LATERAL_RAISE_LIGHT: { male: { untrained: 0.08, novice: 0.14, intermediate: 0.2, advanced: 0.28, elite: 0.36 }, female: { untrained: 0.05, novice: 0.09, intermediate: 0.13, advanced: 0.18, elite: 0.24 } },
  };

  // [key, label, category, primary[], secondary[], pattern, profile, bodyweightLift?, description]
  const RAW = [
    // ---------- Legs ----------
    ['front_squat', 'Front Squat', 'Legs', ['Quads'], ['Glutes', 'Core'], 'squat', 'SQUAT_HEAVY', false, 'A front-loaded squat that shifts emphasis onto the quads and demands a very upright torso.'],
    ['hack_squat', 'Hack Squat', 'Legs', ['Quads'], ['Glutes'], 'squat', 'LEG_PRESS_HEAVY', false, 'A machine squat pattern on a fixed sled path that lets you load the quads heavily with less balance demand.'],
    ['bulgarian_split_squat', 'Bulgarian Split Squat', 'Legs', ['Quads', 'Glutes'], ['Hamstrings'], 'squat', 'ISO_LEG', false, 'A rear-foot-elevated single-leg squat that exposes and fixes side-to-side strength imbalances.'],
    ['walking_lunge', 'Walking Lunge', 'Legs', ['Quads', 'Glutes'], ['Hamstrings', 'Core'], 'squat', 'ISO_LEG', false, 'A moving single-leg pattern that builds unilateral leg strength and balance through each step.'],
    ['reverse_lunge', 'Reverse Lunge', 'Legs', ['Quads', 'Glutes'], ['Hamstrings'], 'squat', 'ISO_LEG', false, 'A stationary backward step-and-lunge that’s easier on the front knee than a forward lunge.'],
    ['leg_extension', 'Leg Extension', 'Legs', ['Quads'], [], 'isolation_extension', 'ISO_ARM_MED', false, 'A machine isolation move that extends the knee to target the quads directly, with no hip involvement.'],
    ['goblet_squat', 'Goblet Squat', 'Legs', ['Quads', 'Glutes'], ['Core'], 'squat', 'ISO_LEG', false, 'A front-held dumbbell squat that’s an easy, back-friendly way to groove squat depth and form.'],
    ['sumo_deadlift', 'Sumo Deadlift', 'Legs', ['Glutes', 'Quads'], ['Hamstrings', 'Lower back'], 'hinge', 'HINGE_HEAVY', false, 'A wide-stance deadlift variation that shortens the pull and shifts more load onto the quads and glutes.'],
    ['deficit_deadlift', 'Deficit Deadlift', 'Legs', ['Hamstrings', 'Glutes'], ['Lower back', 'Quads'], 'hinge', 'HINGE_MODERATE', false, 'A deadlift pulled from a small platform, increasing range of motion and the demand off the floor.'],
    ['trap_bar_deadlift', 'Trap Bar Deadlift', 'Legs', ['Quads', 'Glutes'], ['Hamstrings', 'Lower back'], 'hinge', 'HINGE_HEAVY', false, 'A hex-bar deadlift with a more upright torso than a straight bar, easier on the lower back.'],
    ['box_squat', 'Box Squat', 'Legs', ['Glutes', 'Quads'], ['Hamstrings'], 'squat', 'SQUAT_HEAVY', false, 'A squat performed to a box that teaches sitting back into the hips and builds strength out of the hole.'],
    ['zercher_squat', 'Zercher Squat', 'Legs', ['Quads', 'Glutes'], ['Core', 'Upper back'], 'squat', 'ISO_LEG', false, 'A squat with the bar cradled in the elbows, forcing a very upright, core-braced position.'],
    ['step_up', 'Step-Up', 'Legs', ['Quads', 'Glutes'], ['Hamstrings'], 'squat', 'ISO_LEG', false, 'A single-leg step onto a raised platform that builds unilateral leg drive without much technical demand.'],
    ['glute_bridge', 'Glute Bridge', 'Legs', ['Glutes'], ['Hamstrings'], 'hip_thrust', 'HIP_HEAVY', false, 'A floor-based hip extension move — the simpler, less range-of-motion cousin of the hip thrust.'],
    ['seated_leg_curl', 'Seated Leg Curl', 'Legs', ['Hamstrings'], [], 'leg_curl', 'ISO_LEG', false, 'A machine hamstring isolation move done seated, hitting a slightly different part of the muscle than lying.'],
    ['lying_leg_curl', 'Lying Leg Curl', 'Legs', ['Hamstrings'], [], 'leg_curl', 'ISO_LEG', false, 'A prone machine curl that isolates the hamstrings through knee flexion.'],
    ['standing_calf_raise', 'Standing Calf Raise', 'Legs', ['Calves'], [], 'calf_raise', 'CALF_HEAVY', false, 'A standing ankle-extension move that emphasizes the gastrocnemius through a straight-leg calf stretch.'],
    ['seated_calf_raise', 'Seated Calf Raise', 'Legs', ['Calves'], [], 'calf_raise', 'ISO_LEG', false, 'A bent-knee calf raise that shifts emphasis onto the soleus rather than the gastrocnemius.'],
    ['adductor_machine', 'Hip Adductor Machine', 'Legs', ['Adductors'], [], 'isolation_curl', 'ISO_ARM_MED', false, 'A machine isolation move that squeezes the inner-thigh muscles together against resistance.'],
    ['abductor_machine', 'Hip Abductor Machine', 'Legs', ['Glutes'], ['Hip flexors'], 'isolation_extension', 'ISO_ARM_MED', false, 'A machine isolation move that pushes the legs apart, targeting the outer glutes.'],
    ['single_leg_press', 'Single-Leg Press', 'Legs', ['Quads', 'Glutes'], ['Hamstrings'], 'squat', 'ISO_LEG', false, 'A one-leg-at-a-time version of the leg press that exposes and corrects left/right imbalances.'],
    ['good_morning', 'Good Morning', 'Legs', ['Hamstrings', 'Lower back'], ['Glutes'], 'hinge', 'HINGE_MODERATE', false, 'A bar-on-back hip hinge that builds the hamstrings and lower back through a long lever.'],
    ['pistol_squat', 'Pistol Squat', 'Legs', ['Quads', 'Glutes'], ['Core'], 'squat', 'ISO_LEG', true, 'A single-leg bodyweight squat to full depth — a serious test of unilateral strength and balance.'],
    ['smith_machine_squat', 'Smith Machine Squat', 'Legs', ['Quads', 'Glutes'], ['Hamstrings'], 'squat', 'SQUAT_HEAVY', false, 'A fixed-bar-path squat that trades some stabilizer demand for the ability to push heavier and safer alone.'],

    // ---------- Back ----------
    ['barbell_row', 'Barbell Row', 'Back', ['Mid-back', 'Lats'], ['Biceps', 'Rear shoulders'], 'horizontal_pull', 'ROW_HEAVY', false, 'A bent-over barbell pull that builds back thickness and is one of the best mass-builders for the whole back.'],
    ['pendlay_row', 'Pendlay Row', 'Back', ['Mid-back', 'Lats'], ['Biceps'], 'horizontal_pull', 'ROW_HEAVY', false, 'A dead-stop barbell row from the floor on every rep, removing momentum from the pull.'],
    ['chest_supported_row', 'Chest-Supported Row', 'Back', ['Mid-back'], ['Lats', 'Biceps'], 'horizontal_pull', 'ROW_MODERATE', false, 'A row braced against a bench that takes the lower back out of the equation entirely.'],
    ['cable_row', 'Seated Cable Row', 'Back', ['Mid-back', 'Lats'], ['Biceps'], 'horizontal_pull', 'ROW_MODERATE', false, 'A seated cable pull that keeps constant tension on the back through the full range of motion.'],
    ['single_arm_db_row', 'Single-Arm Dumbbell Row', 'Back', ['Lats', 'Mid-back'], ['Biceps'], 'horizontal_pull', 'ROW_MODERATE', false, 'A one-arm row braced on a bench that lets each side of the back work independently.'],
    ['t_bar_row', 'T-Bar Row', 'Back', ['Mid-back', 'Lats'], ['Biceps', 'Rear shoulders'], 'horizontal_pull', 'ROW_HEAVY', false, 'A chest-over-bar row that allows very heavy loading of the mid-back with a neutral grip.'],
    ['meadows_row', 'Meadows Row', 'Back', ['Lats', 'Mid-back'], ['Biceps'], 'horizontal_pull', 'ROW_MODERATE', false, 'A landmine-anchored single-arm row with a long stretch at the bottom of each rep.'],
    ['chin_up', 'Chin-Up', 'Back', ['Lats'], ['Biceps', 'Grip'], 'vertical_pull', 'BW_PULL', true, 'An underhand-grip pull-up variation that recruits the biceps more than a standard pull-up.'],
    ['wide_grip_pulldown', 'Wide-Grip Lat Pulldown', 'Back', ['Lats'], ['Biceps', 'Upper back'], 'vertical_pull', 'PULLDOWN_LIGHT', false, 'A wide-grip pulldown that emphasizes back width over a standard-grip version.'],
    ['close_grip_pulldown', 'Close-Grip Pulldown', 'Back', ['Lats'], ['Biceps'], 'vertical_pull', 'PULLDOWN_LIGHT', false, 'A close, often neutral-grip pulldown that lets you pull heavier with more bicep assistance.'],
    ['straight_arm_pulldown', 'Straight-Arm Pulldown', 'Back', ['Lats'], ['Core'], 'vertical_pull', 'REAR_DELT_LIGHT', false, 'A cable isolation move that pulls the lats through shoulder extension with straight arms, no biceps involved.'],
    ['rack_pull', 'Rack Pull', 'Back', ['Lats', 'Traps'], ['Lower back', 'Forearms'], 'hinge', 'HINGE_HEAVY', false, 'A partial-range deadlift pulled from pins above the knee, allowing supra-maximal back loading.'],
    ['snatch_grip_deadlift', 'Snatch-Grip Deadlift', 'Back', ['Hamstrings', 'Glutes'], ['Upper back', 'Lower back'], 'hinge', 'HINGE_MODERATE', false, 'A very wide-grip deadlift that increases range of motion and upper-back demand.'],
    ['stiff_leg_deadlift', 'Stiff-Leg Deadlift', 'Back', ['Hamstrings'], ['Glutes', 'Lower back'], 'hinge', 'HINGE_MODERATE', false, 'A near-straight-leg hip hinge that isolates the hamstrings more than a Romanian deadlift.'],
    ['single_arm_lat_pulldown', 'Single-Arm Lat Pulldown', 'Back', ['Lats'], ['Biceps'], 'vertical_pull', 'PULLDOWN_LIGHT', false, 'A one-arm cable pulldown that lets each side of the back work through its own full range.'],
    ['inverted_row', 'Inverted Row', 'Back', ['Mid-back', 'Lats'], ['Biceps'], 'horizontal_pull', 'BW_PULL', true, 'A horizontal bodyweight pull under a bar or rings — a great pull-up-strength-building regression.'],
    ['landmine_row', 'Landmine Row', 'Back', ['Mid-back', 'Lats'], ['Biceps'], 'horizontal_pull', 'ROW_MODERATE', false, 'A row using one end of a barbell anchored on the floor, giving a natural pulling arc.'],
    ['kroc_row', 'Kroc Row', 'Back', ['Lats', 'Mid-back'], ['Biceps', 'Grip'], 'horizontal_pull', 'ROW_HEAVY', false, 'A heavy, higher-rep single-arm dumbbell row named for the strongman who popularized it.'],
    ['seal_row', 'Seal Row', 'Back', ['Mid-back'], ['Lats', 'Biceps'], 'horizontal_pull', 'ROW_MODERATE', false, 'A row performed lying face-down on an elevated bench, removing any body english entirely.'],

    // ---------- Chest ----------
    ['incline_bench', 'Incline Barbell Bench Press', 'Chest', ['Upper chest'], ['Shoulders', 'Triceps'], 'horizontal_push', 'PRESS_MODERATE', false, 'An angled barbell press that shifts more emphasis onto the upper chest than a flat bench.'],
    ['decline_bench', 'Decline Bench Press', 'Chest', ['Lower chest'], ['Triceps', 'Shoulders'], 'horizontal_push', 'PRESS_MODERATE', false, 'A downward-angled press that emphasizes the lower chest fibers.'],
    ['close_grip_bench', 'Close-Grip Bench Press', 'Chest', ['Triceps'], ['Chest', 'Shoulders'], 'horizontal_push', 'PRESS_MODERATE', false, 'A narrow-grip bench press that shifts the emphasis from chest onto the triceps.'],
    ['db_bench_press', 'Dumbbell Bench Press', 'Chest', ['Chest'], ['Shoulders', 'Triceps'], 'horizontal_push', 'PRESS_MODERATE', false, 'A dumbbell press that allows a deeper stretch and independent-arm loading versus a barbell.'],
    ['db_fly', 'Dumbbell Fly', 'Chest', ['Chest'], ['Shoulders'], 'horizontal_push', 'PRESS_DB', false, 'A flat-bench isolation move that stretches and squeezes the chest with an arcing arm path.'],
    ['cable_fly', 'Cable Fly', 'Chest', ['Chest'], ['Shoulders'], 'horizontal_push', 'PRESS_DB', false, 'A cable isolation move that keeps constant tension on the chest through the whole range of motion.'],
    ['cable_crossover', 'Cable Crossover', 'Chest', ['Chest'], ['Shoulders'], 'horizontal_push', 'PRESS_DB', false, 'A high-to-low cable fly that emphasizes the lower/inner chest at the point of the squeeze.'],
    ['pec_deck', 'Pec Deck', 'Chest', ['Chest'], [], 'horizontal_push', 'PRESS_DB', false, 'A machine chest isolation move with a fixed arc, easy to load safely to failure.'],
    ['floor_press', 'Floor Press', 'Chest', ['Triceps', 'Chest'], ['Shoulders'], 'horizontal_push', 'PRESS_MODERATE', false, 'A bench press performed lying on the floor, shortening the range and emphasizing lockout strength.'],
    ['push_up', 'Push-Up', 'Chest', ['Chest'], ['Shoulders', 'Triceps'], 'horizontal_push', 'BW_PRESS', true, 'The classic bodyweight press — scalable from beginner to advanced just by changing hand/foot position or added weight.'],
    ['incline_db_fly', 'Incline Dumbbell Fly', 'Chest', ['Upper chest'], ['Shoulders'], 'horizontal_push', 'PRESS_DB', false, 'An angled fly that stretches and isolates the upper chest fibers specifically.'],
    ['guillotine_press', 'Guillotine Press', 'Chest', ['Upper chest'], ['Shoulders'], 'horizontal_push', 'PRESS_MODERATE', false, 'A bench press with the bar lowered to the neck/upper chest, emphasizing the upper fibers.'],
    ['svend_press', 'Svend Press', 'Chest', ['Chest'], ['Shoulders'], 'horizontal_push', 'PRESS_DB', false, 'A standing press-out with plates squeezed together, isolating the chest through adduction.'],
    ['landmine_press', 'Landmine Press', 'Chest', ['Upper chest', 'Shoulders'], ['Triceps'], 'vertical_push', 'PRESS_LIGHT', false, 'A single-arm press with a barbell anchored on the floor, easy on the shoulders with a natural arc.'],

    // ---------- Shoulders ----------
    ['lateral_raise', 'Lateral Raise', 'Shoulders', ['Shoulders'], [], 'isolation_extension', 'LATERAL_RAISE_LIGHT', false, 'A side-arm-raise isolation move that builds shoulder width by targeting the side delts directly.'],
    ['front_raise', 'Front Raise', 'Shoulders', ['Shoulders'], [], 'isolation_extension', 'LATERAL_RAISE_LIGHT', false, 'A forward-arm-raise isolation move for the front delts, usually with light weight.'],
    ['rear_delt_fly', 'Rear Delt Fly', 'Shoulders', ['Rear shoulders'], ['Upper back'], 'horizontal_pull', 'REAR_DELT_LIGHT', false, 'A bent-over or machine fly that targets the rear delts, a common weak point.'],
    ['arnold_press', 'Arnold Press', 'Shoulders', ['Shoulders'], ['Triceps'], 'vertical_push', 'PRESS_LIGHT', false, 'A rotating dumbbell press that works the shoulder through a fuller range than a standard press.'],
    ['db_shoulder_press', 'Dumbbell Shoulder Press', 'Shoulders', ['Shoulders'], ['Triceps'], 'vertical_push', 'PRESS_LIGHT', false, 'A seated or standing dumbbell press that allows a more natural pressing path than a barbell.'],
    ['cable_lateral_raise', 'Cable Lateral Raise', 'Shoulders', ['Shoulders'], [], 'isolation_extension', 'LATERAL_RAISE_LIGHT', false, 'A cable version of the lateral raise that keeps tension on the delt even at the bottom of the rep.'],
    ['upright_row', 'Upright Row', 'Shoulders', ['Shoulders', 'Traps'], ['Biceps'], 'vertical_pull', 'PRESS_LIGHT', false, 'A vertical pull to chin height that targets the side delts and traps together.'],
    ['machine_shoulder_press', 'Machine Shoulder Press', 'Shoulders', ['Shoulders'], ['Triceps'], 'vertical_push', 'PRESS_LIGHT', false, 'A fixed-path pressing machine that lets you load the shoulders heavily with minimal stabilizer demand.'],
    ['push_press', 'Push Press', 'Shoulders', ['Shoulders'], ['Triceps', 'Legs'], 'vertical_push', 'PRESS_MODERATE', false, 'An overhead press that uses a leg drive dip-and-drive to move more weight than a strict press.'],
    ['seated_military_press', 'Seated Military Press', 'Shoulders', ['Shoulders'], ['Triceps'], 'vertical_push', 'PRESS_LIGHT', false, 'A seated barbell overhead press that removes leg drive and any lower-back assistance.'],
    ['cuban_press', 'Cuban Press', 'Shoulders', ['Rear shoulders', 'Shoulders'], ['Traps'], 'vertical_push', 'REAR_DELT_LIGHT', false, 'A three-part press combining an upright row, external rotation, and press for shoulder health.'],
    ['reverse_pec_deck', 'Reverse Pec Deck', 'Shoulders', ['Rear shoulders'], ['Upper back'], 'horizontal_pull', 'REAR_DELT_LIGHT', false, 'A machine reverse-fly that isolates the rear delts with a fixed, controlled arc.'],
    ['plate_raise', 'Plate Raise', 'Shoulders', ['Shoulders'], [], 'isolation_extension', 'LATERAL_RAISE_LIGHT', false, 'A front raise performed holding a weight plate rather than dumbbells.'],
    ['behind_neck_press', 'Behind-the-Neck Press', 'Shoulders', ['Shoulders'], ['Triceps'], 'vertical_push', 'PRESS_LIGHT', false, 'An overhead press lowered behind the neck rather than the front — needs good shoulder mobility.'],

    // ---------- Arms ----------
    ['hammer_curl', 'Hammer Curl', 'Arms', ['Biceps'], ['Forearms'], 'isolation_curl', 'ISO_ARM_MED', false, 'A neutral-grip curl that emphasizes the brachialis and forearms alongside the biceps.'],
    ['incline_db_curl', 'Incline Dumbbell Curl', 'Arms', ['Biceps'], [], 'isolation_curl', 'ISO_ARM_SMALL', false, 'A curl on an incline bench that stretches the biceps at the bottom more than a standing curl.'],
    ['concentration_curl', 'Concentration Curl', 'Arms', ['Biceps'], [], 'isolation_curl', 'ISO_ARM_SMALL', false, 'A seated single-arm curl braced against the inner thigh for maximum bicep isolation.'],
    ['cable_curl', 'Cable Curl', 'Arms', ['Biceps'], [], 'isolation_curl', 'ISO_ARM_SMALL', false, 'A cable curl that keeps constant tension on the biceps through the full range of motion.'],
    ['ez_bar_curl', 'EZ-Bar Curl', 'Arms', ['Biceps'], ['Forearms'], 'isolation_curl', 'ISO_ARM_MED', false, 'A curved-bar curl that’s easier on the wrists than a straight barbell curl.'],
    ['spider_curl', 'Spider Curl', 'Arms', ['Biceps'], [], 'isolation_curl', 'ISO_ARM_SMALL', false, 'A curl performed chest-down on an incline bench, removing all momentum from the lift.'],
    ['reverse_curl', 'Reverse Curl', 'Arms', ['Forearms', 'Biceps'], [], 'isolation_curl', 'ISO_ARM_SMALL', false, 'An overhand-grip curl that shifts emphasis onto the forearms and brachialis.'],
    ['zottman_curl', 'Zottman Curl', 'Arms', ['Biceps', 'Forearms'], [], 'isolation_curl', 'ISO_ARM_SMALL', false, 'A curl up with a supinated grip and down with a pronated grip, hitting biceps and forearms both.'],
    ['drag_curl', 'Drag Curl', 'Arms', ['Biceps'], [], 'isolation_curl', 'ISO_ARM_SMALL', false, 'A curl where the bar drags up the torso, keeping constant bicep tension without shoulder help.'],
    ['overhead_tricep_extension', 'Overhead Tricep Extension', 'Arms', ['Triceps'], [], 'isolation_extension', 'ISO_ARM_MED', false, 'An overhead extension that stretches the long head of the triceps more than a pushdown does.'],
    ['skull_crusher', 'Skull Crusher', 'Arms', ['Triceps'], [], 'isolation_extension', 'ISO_ARM_MED', false, 'A lying tricep extension lowered toward the forehead — a classic mass-builder for the triceps.'],
    ['close_grip_push_up', 'Close-Grip Push-Up', 'Arms', ['Triceps'], ['Chest'], 'horizontal_push', 'BW_PRESS', true, 'A hands-close push-up variation that shifts emphasis from chest onto the triceps.'],
    ['cable_overhead_extension', 'Cable Overhead Extension', 'Arms', ['Triceps'], [], 'isolation_extension', 'ISO_ARM_MED', false, 'A cable version of the overhead extension, keeping tension on the triceps throughout.'],
    ['single_arm_tricep_extension', 'Single-Arm Tricep Extension', 'Arms', ['Triceps'], [], 'isolation_extension', 'ISO_ARM_SMALL', false, 'A one-arm overhead extension that lets each triceps work through its own full range.'],
    ['tricep_kickback', 'Tricep Kickback', 'Arms', ['Triceps'], [], 'isolation_extension', 'ISO_ARM_SMALL', false, 'A bent-over single-arm extension that isolates the triceps at end-range lockout.'],
    ['jm_press', 'JM Press', 'Arms', ['Triceps'], ['Chest'], 'horizontal_push', 'ISO_ARM_MED', false, 'A hybrid close-grip press/skull-crusher that lets you load the triceps heavier than a pure extension.'],
    ['diamond_push_up', 'Diamond Push-Up', 'Arms', ['Triceps'], ['Chest'], 'horizontal_push', 'BW_PRESS', true, 'A close hands-together push-up variation that maximizes triceps involvement.'],
    ['wrist_curl', 'Wrist Curl', 'Arms', ['Forearms'], [], 'isolation_curl', 'ISO_ARM_SMALL', false, 'A seated forearm isolation move that curls the wrist upward against resistance.'],
    ['reverse_wrist_curl', 'Reverse Wrist Curl', 'Arms', ['Forearms'], [], 'isolation_extension', 'ISO_ARM_SMALL', false, 'The extensor-side counterpart to the wrist curl, often neglected relative to the flexors.'],
    ['cross_body_hammer_curl', 'Cross-Body Hammer Curl', 'Arms', ['Biceps'], ['Forearms'], 'isolation_curl', 'ISO_ARM_MED', false, 'A hammer curl brought across the body rather than straight up, shifting the angle of pull.'],
    ['tricep_dip_bench', 'Bench Tricep Dip', 'Arms', ['Triceps'], ['Shoulders'], 'isolation_extension', 'BW_PRESS', true, 'A bodyweight dip with hands on a bench and feet out, a simpler regression of a full dip.'],
    ['rope_pushdown', 'Rope Pushdown', 'Arms', ['Triceps'], [], 'isolation_extension', 'ISO_ARM_SMALL', false, 'A cable pushdown using a rope attachment, allowing the hands to split apart at the bottom for a fuller squeeze.'],
    ['band_pushdown', 'Band Pushdown', 'Arms', ['Triceps'], [], 'isolation_extension', 'ISO_ARM_SMALL', false, 'A resistance-band version of the tricep pushdown, useful when a cable stack isn’t available.'],

    // ---------- Abs ----------
    ['weighted_decline_situp', 'Weighted Decline Sit-Up', 'Abs', ['Abs'], ['Hip flexors'], 'core', 'ABS_LOADED', false, 'A decline-bench sit-up holding extra weight, adding real load to a bodyweight staple.'],
    ['cable_crunch_standing', 'Standing Cable Crunch', 'Abs', ['Abs'], [], 'core', 'ABS_LOADED', false, 'A standing version of the cable crunch that lets you crunch through a full spinal flexion under load.'],
    ['machine_crunch', 'Machine Crunch', 'Abs', ['Abs'], [], 'core', 'ABS_LOADED', false, 'A seated crunch machine that adds progressive resistance to a basic ab movement.'],
    ['ab_wheel_rollout', 'Ab Wheel Rollout', 'Abs', ['Abs'], ['Lower back', 'Shoulders'], 'core', 'ABS_BW', true, 'A rolling-out core move that’s one of the hardest bodyweight ab exercises there is.'],
    ['hanging_knee_raise', 'Hanging Knee Raise', 'Abs', ['Abs'], ['Hip flexors', 'Grip'], 'core', 'ABS_BW', true, 'A hanging core move that curls the knees toward the chest — an easier regression of the leg raise.'],
    ['toe_to_bar', 'Toe-to-Bar', 'Abs', ['Abs'], ['Hip flexors', 'Grip'], 'core', 'ABS_BW', true, 'An advanced hanging core move that brings the toes all the way up to touch the bar.'],
    ['russian_twist', 'Russian Twist', 'Abs', ['Abs'], ['Obliques'], 'core', 'ABS_LOADED', false, 'A seated rotational core move, usually done holding a plate or medicine ball for added resistance.'],
    ['weighted_situp', 'Weighted Sit-Up', 'Abs', ['Abs'], ['Hip flexors'], 'core', 'ABS_LOADED', false, 'A standard sit-up performed holding extra weight against the chest for progressive overload.'],
    ['reverse_crunch', 'Reverse Crunch', 'Abs', ['Abs'], ['Hip flexors'], 'core', 'ABS_BW', true, 'A floor-based move that curls the hips toward the ribs rather than the shoulders toward the knees.'],
    ['decline_leg_raise', 'Decline Leg Raise', 'Abs', ['Abs'], ['Hip flexors'], 'core', 'ABS_BW', true, 'A leg raise performed on a decline bench, adding range of motion versus a flat-floor version.'],
    ['pallof_press', 'Pallof Press', 'Abs', ['Abs', 'Obliques'], [], 'core', 'ABS_LOADED', false, 'An anti-rotation cable press that trains the core to resist twisting rather than to create movement.'],
    ['landmine_twist', 'Landmine Twist', 'Abs', ['Obliques', 'Abs'], ['Shoulders'], 'core', 'ABS_LOADED', false, 'A rotational core move swinging a landmine-anchored barbell from side to side.'],
    ['v_up', 'V-Up', 'Abs', ['Abs'], ['Hip flexors'], 'core', 'ABS_BW', true, 'A floor exercise folding the torso and legs up together into a V shape — a tough full bodyweight ab move.'],

    // ---------- Extra Back/Chest/Shoulders finishers to round out the pool ----------
    ['shrug_dumbbell', 'Dumbbell Shrug', 'Shoulders', ['Traps'], ['Forearms'], 'shrug', 'SHRUG_HEAVY', false, 'A dumbbell version of the shrug that allows a more natural shoulder path than a barbell.'],
    ['face_pull_rope', 'Rope Face Pull', 'Back', ['Rear shoulders'], ['Upper back', 'Traps'], 'horizontal_pull', 'REAR_DELT_LIGHT', false, 'A rope-attachment cable pull to the face — the same staple movement as the face pull, named for its setup.'],
    ['lat_pullover_machine', 'Machine Pullover', 'Back', ['Lats'], ['Chest'], 'vertical_pull', 'PULLDOWN_LIGHT', false, 'A machine-based pullover that stretches and works the lats through shoulder extension.'],
  ];

  const LIST = RAW.map(function (row) {
    return {
      key: row[0], label: row[1], category: row[2], primary: row[3], secondary: row[4],
      pattern: row[5], table: PROFILES[row[6]], bodyweightLift: !!row[7], description: row[8],
    };
  });

  const BY_KEY = {};
  LIST.forEach(function (ex) { BY_KEY[ex.key] = ex; });

  // ---------- fuzzy search ----------

  function normalize(str) {
    return String(str || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  // Classic Levenshtein edit distance -- small inputs (exercise names), no
  // need for anything fancier than the textbook DP table.
  function editDistance(a, b) {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prev = new Array(n + 1);
    let curr = new Array(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      const tmp = prev; prev = curr; curr = tmp;
    }
    return prev[n];
  }

  // Returns { exact, close } -- `exact` is a single pool entry matched
  // exactly or as a clear substring; `close` is a ranked list of
  // typo-tolerant near-misses (edit distance scaled to query length) worth
  // suggesting as "Did you mean X?" before offering the custom-exercise path.
  function search(query) {
    const q = normalize(query);
    if (!q) return { exact: null, close: [] };

    const exact = LIST.find(function (ex) { return normalize(ex.label) === q; });
    if (exact) return { exact: exact, close: [] };

    const substring = LIST.filter(function (ex) { return normalize(ex.label).indexOf(q) !== -1; });
    if (substring.length) return { exact: substring[0], close: [] };

    const maxDistance = q.length <= 4 ? 1 : q.length <= 8 ? 2 : 3;
    const scored = LIST.map(function (ex) {
      return { ex: ex, dist: editDistance(q, normalize(ex.label)) };
    }).filter(function (s) { return s.dist <= maxDistance; })
      .sort(function (a, b) { return a.dist - b.dist; })
      .slice(0, 3)
      .map(function (s) { return s.ex; });

    return { exact: null, close: scored };
  }

  return { LIST, BY_KEY, search };
})();
