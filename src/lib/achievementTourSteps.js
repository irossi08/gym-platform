window.App = window.App || {};

/**
 * Short, separate mini-tour for the Achievements page, triggered once --
 * right after the goal-celebration overlay is dismissed the very first
 * time a user ever reaches a goal (see GoalCelebration.js) -- not part of
 * the main App.TourSteps run and tracked with its own seen flag
 * (hasSeenAchievementTour) so it never interferes with the main tour.
 * Unlike the main tour, this one only ever needs 3 steps: it's just
 * orienting the user to a page they've never seen before, not
 * re-explaining the whole app.
 */
App.AchievementTourSteps = [
  {
    route: 'achievements',
    target: '.page-title',
    message: 'You just unlocked a new page — Achievements! Reaching a goal archives it here permanently, alongside a medal for how you ranked at the moment you hit it.',
  },
  {
    route: 'achievements',
    target: '.achievement-medal',
    message: 'Medals come in four tiers — Novice, Intermediate, Advanced, and Elite. For an exercise goal, the tier is whichever strength-standard rank your 1RM landed in; for a bodyweight goal, it’s based on how much you changed in total.',
  },
  {
    route: 'achievements',
    target: '.achievement-item',
    message: 'This is the one you just earned! Every future goal you reach will show up here too, most recent first.',
  },
];
