window.App = window.App || {};

/**
 * Onboarding tour step config, driving App.Components.TourOverlay. Each
 * step is data, not logic: which route it needs (null = stay put), a CSS
 * selector for the real element to spotlight (null = no spotlight, just a
 * centered message), and the robot's line.
 *
 * The Split Builder day-card and missed-workout steps target elements that
 * only exist once a split has actually been generated -- a brand-new
 * account (the only time this tour auto-plays) will only ever see the
 * questionnaire there. TourOverlay skips a step automatically if its
 * target isn't found rather than faking data to force it to appear, so
 * those two steps quietly no-op for a first-time run and would only show
 * for an account that already has a split (e.g. a manually-replayed tour).
 */
App.TourSteps = [
  {
    route: 'home',
    target: '#home-trend-container',
    message: 'This is your 1-rep-max progress graph. Every set you log for each exercise plots here over time, color-coded per lift once you’ve got a few logged.',
  },
  {
    route: 'home',
    target: '#home-streak-badge',
    message: 'This little seedling tracks your training streak — it grows a bit taller with every consecutive scheduled day you complete. Tap it any time to see it up close.',
  },
  {
    route: 'home',
    target: '#home-today-container',
    message: '“Today’s Workout” shows whatever your split has scheduled for today, with a one-tap “Mark complete” button when you’re done.',
  },
  {
    route: 'home',
    target: '#home-goal-container',
    message: 'Set a bodyweight or exercise goal here to track progress toward it — you’ll get a full celebration the moment you hit it.',
  },
  {
    route: 'one-rep-max',
    target: '#f-lift-slot',
    message: 'Pick any exercise here — grouped by muscle group — to log a set for it.',
  },
  {
    route: 'one-rep-max',
    target: '#lift-form-container button[type="submit"]',
    message: 'Enter your weight and reps, then log the set here. We’ll estimate your true one-rep max from it.',
  },
  {
    route: 'one-rep-max',
    target: '#result-container',
    message: 'Your estimated 1RM shows up here, averaged across three proven formulas.',
  },
  {
    route: 'one-rep-max',
    target: '#gauge-container',
    message: 'And this gauge shows exactly where that lift ranks against lifters of your bodyweight and sex — from untrained up to elite.',
  },
  {
    route: 'history',
    target: '#history-container',
    message: 'Every set you’ve ever logged lives here, filterable by exercise, with the option to delete any entry.',
  },
  {
    route: 'history',
    target: '#chart-container',
    message: 'And this trend chart plots your recent lifts side by side so you can see who’s climbing fastest.',
  },
  {
    route: 'split-builder',
    target: '.split-form',
    message: 'Answer a few questions here and we’ll generate a full weekly training split for you.',
  },
  {
    route: 'split-builder',
    target: '.split-day-card:not(.split-day-card--rest)',
    message: 'Each day is a fully editable card — open a row to change its sets, reps, or rest, or tap an exercise’s name to swap it for another.',
  },
  {
    route: 'split-builder',
    target: '.day-missed-btn',
    message: 'Missed a workout? Tap here to reschedule it to another day — your streak stays safe as long as you complete it there instead.',
  },
  {
    route: null,
    target: null,
    message: 'That’s the tour! One last thing: once you reach your first goal, an Achievements page unlocks in the menu showing off the medal you earned. Go get that first one!',
  },
];
