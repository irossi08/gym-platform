window.App = window.App || {};

/**
 * Formula-based calorie/macro estimate shown alongside Build My Split's
 * results -- Mifflin-St Jeor for BMR, an activity multiplier for TDEE, then
 * a goal-based adjustment for the daily calorie target. Purely arithmetic,
 * no personalization beyond the profile fields it's given; the UI carries
 * an explicit disclaimer (see SplitBuilder.js) rather than presenting this
 * as professional nutrition advice, same spirit as the standards-table and
 * split-generator disclaimers elsewhere in the app.
 */
App.Nutrition = (function () {
  const ACTIVITY_MULTIPLIERS = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9,
  };

  const ACTIVITY_LABELS = {
    sedentary: 'Sedentary',
    lightly_active: 'Lightly Active',
    moderately_active: 'Moderately Active',
    very_active: 'Very Active',
    extremely_active: 'Extremely Active',
  };

  // Percent above/below TDEE for the daily calorie target. Recomposition
  // and Maintenance both land on TDEE itself.
  const GOAL_CALORIE_ADJUST = {
    fat_loss: -0.20,
    lean_bulk: 0.10,
    normal_bulk: 0.20,
    recomposition: 0,
    maintenance: 0,
  };

  const GOAL_LABELS = {
    fat_loss: 'Fat Loss',
    lean_bulk: 'Lean Bulk',
    normal_bulk: 'Normal Bulk',
    recomposition: 'Recomposition',
    maintenance: 'Maintenance',
  };

  // Protein target in g/kg bodyweight -- within the requested 1.6-2.2
  // range, biased to the higher end for Fat Loss/Recomposition (protein
  // preservation while in a deficit or trying to shift composition).
  const PROTEIN_G_PER_KG = {
    fat_loss: 2.2,
    lean_bulk: 1.8,
    normal_bulk: 1.6,
    recomposition: 2.2,
    maintenance: 1.8,
  };

  const FAT_PERCENT_OF_CALORIES = 0.275; // midpoint of the requested 25-30%

  function toKg(weight, unit) {
    return unit === 'lb' ? App.Units.convert(weight, 'lb', 'kg') : weight;
  }

  function toCm(height, unit) {
    return unit === 'in' ? height * 2.54 : height;
  }

  // Returns null rather than a garbage estimate if any input this formula
  // actually depends on is missing -- the calling page decides how to show
  // that (e.g. "add your height to see this").
  function calculate(profile) {
    if (!profile || !(profile.age > 0) || !(profile.bodyweight > 0) || !(profile.height > 0) || !profile.sex) return null;

    const weightKg = toKg(profile.bodyweight, profile.bodyweightUnit);
    const heightCm = toCm(profile.height, profile.heightUnit);
    const sexOffset = profile.sex === 'female' ? -161 : 5;
    const bmr = 10 * weightKg + 6.25 * heightCm - 5 * profile.age + sexOffset;

    const activityLevel = ACTIVITY_MULTIPLIERS[profile.activityLevel] ? profile.activityLevel : 'moderately_active';
    const tdee = bmr * ACTIVITY_MULTIPLIERS[activityLevel];

    const goal = GOAL_CALORIE_ADJUST[profile.goal] != null ? profile.goal : 'maintenance';
    const calories = tdee * (1 + GOAL_CALORIE_ADJUST[goal]);

    const proteinG = PROTEIN_G_PER_KG[goal] * weightKg;
    const proteinCals = proteinG * 4;
    const fatCals = calories * FAT_PERCENT_OF_CALORIES;
    const fatG = fatCals / 9;
    const carbCals = Math.max(calories - proteinCals - fatCals, 0);
    const carbG = carbCals / 4;

    return {
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      calories: Math.round(calories),
      protein: Math.round(proteinG),
      fat: Math.round(fatG),
      carbs: Math.round(carbG),
      goal: goal,
      activityLevel: activityLevel,
    };
  }

  return { calculate, ACTIVITY_MULTIPLIERS, ACTIVITY_LABELS, GOAL_LABELS };
})();
