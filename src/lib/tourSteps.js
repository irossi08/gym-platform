window.App = window.App || {};

/**
 * Main onboarding tour step config, driving App.Components.TourOverlay. Each
 * step is data, not logic: which route it needs (null = stay put), a CSS
 * selector for the real element to spotlight (null = no spotlight, just a
 * centered message), and the robot's line (a plain string, or a function of
 * the current user for a message that needs to check live state).
 *
 * The Split Builder day-card/missed-workout steps and the Achievements step
 * all target elements that only exist once there's something to show (a
 * generated split, an unlocked Achievements page) -- a brand-new account
 * (the only time this tour auto-plays) may not have either yet.
 * TourOverlay skips a step automatically if its target isn't found rather
 * than faking data to force it to appear, so those steps quietly no-op
 * when the feature isn't unlocked yet.
 */
App.TourSteps = [
  // ---------- Home ----------
  {
    route: 'home',
    target: '#home-profile-container',
    message: 'This is your profile card — your picture (whichever you chose: an uploaded photo or a preset avatar), name, age, bodyweight, and current streak. Any medals you’ve earned sit right on the bottom edge of your picture, and tapping them opens the full list. The little pencil icon opens an edit form any time you want to update your details or swap your picture.',
  },
  {
    route: 'home',
    target: '#home-trend-container',
    message: 'This is your 1-rep-max progress graph. Every set you log for each exercise plots here over time — the legend is color-coded and searchable, and the range selector above it lets you zoom from the last month out to the last year.',
  },
  {
    route: 'home',
    target: '#home-streak-badge',
    message: 'This little seedling tracks your training streak — it grows a bit taller with every consecutive scheduled day you complete. Tap it any time to open the full-size version.',
  },
  {
    route: 'home',
    target: '#home-today-container',
    message: '“Today’s Workout” shows whatever your split has scheduled for today, with a one-tap “Mark complete” button when you’re done.',
  },
  {
    route: 'home',
    target: '#home-goal-container',
    message: 'Set a bodyweight or exercise goal here, log your bodyweight right from this card, and track progress toward it — you’ll get a full celebration the moment you hit it.',
  },
  {
    route: 'home',
    target: '.page-quick-links',
    message: 'This bar at the bottom is always there — tap an icon to jump straight to Home, 1 Rep Max, History, Build My Split, Achievements (once you’ve unlocked it), or Settings. The hamburger menu in the top-left corner gets you to the same pages too, plus Log out.',
  },

  // ---------- 1 Rep Max ----------
  {
    route: 'one-rep-max',
    target: '#f-lift-slot',
    message: 'Pick any exercise here — grouped by muscle group.',
  },
  {
    route: 'one-rep-max',
    target: '#f-lift-slot',
    message: 'Inside that same picker is a search box: type an exercise we don’t already list, and if it matches something in our library, you can add it fully enriched — muscles, animation, standards ranking, all of it. If we don’t recognize it, you can still add it as a custom exercise, just without a standards ranking.',
  },
  {
    route: 'one-rep-max',
    target: '#lift-form-container button[type="submit"]',
    message: 'Enter your weight and reps, then log the set here. We’ll estimate your true one-rep max from it.',
  },
  {
    route: 'one-rep-max',
    target: '#info-panel-container',
    message: 'This panel shows the selected exercise’s target muscles, a quick description, and a simple animation of the movement.',
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

  // ---------- History ----------
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

  // ---------- Build My Split ----------
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

  // ---------- Achievements (only if already unlocked) ----------
  {
    route: 'achievements',
    target: '.achievements-list',
    message: 'Every goal you reach gets archived here permanently with a medal for how you ranked when you hit it.',
  },

  // ---------- Settings ----------
  {
    route: 'settings',
    target: '#settings-colors-card',
    message: 'Switch between dark and light mode here — it applies everywhere in the app, right away.',
  },
  {
    route: 'settings',
    target: '#settings-layout-card',
    message: 'And here you can switch to a more compact layout, swap History/Achievements/exercise pickers between list and card view, and change the text size app-wide.',
  },
  {
    route: 'settings',
    target: '#settings-reset',
    message: 'If you ever want to undo your changes, this button resets everything back to the default look in one click.',
  },

  // ---------- Closing ----------
  {
    route: null,
    target: null,
    message: function (user) {
      const base = 'That’s the tour! ';
      const hasAchievements = App.Storage.getAchievements(user.id).length > 0;
      return hasAchievements
        ? base + 'Go put it all to use.'
        : base + 'One last thing: once you reach your first goal, an Achievements page unlocks in the menu showing off the medal you earned. Go get that first one!';
    },
  },
];
