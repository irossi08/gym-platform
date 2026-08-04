window.App = window.App || {};
App.Pages = App.Pages || {};

App.Pages.Landing = (function () {
  const ICONS = {
    bolt: '<svg viewBox="0 0 24 24" class="feature-icon-svg"><path d="M13 2 4 14h7l-1 8 10-13h-7l1-7z" fill="currentColor"/></svg>',
    gauge: '<svg viewBox="0 0 24 24" class="feature-icon-svg"><path d="M4 18a8 8 0 0 1 16 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="18" x2="16" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="18" r="1.6" fill="currentColor"/></svg>',
    trend: '<svg viewBox="0 0 24 24" class="feature-icon-svg"><polyline points="3,17 9,11 13,15 21,5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="15,5 21,5 21,11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    dumbbell: '<svg viewBox="0 0 24 24" class="feature-icon-svg"><path d="M2 10v4M4 7v10M20 7v10M22 10v4M6 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };

  const FEATURES = [
    { icon: 'bolt', title: 'Instant 1RM', body: 'Epley, Brzycki, and Lombardi averaged into one headline number the second you log a set.' },
    { icon: 'gauge', title: 'Strength Standards', body: 'See exactly where you rank — Untrained to Elite — on bodyweight-scaled standards for every lift.' },
    { icon: 'trend', title: 'Progress Tracking', body: 'Every set saved to your account. Watch your estimated max move over weeks and months.' },
    { icon: 'dumbbell', title: '13 Lifts Covered', body: 'Squat, bench, and deadlift through pull-ups, dips, and isolation work — one system for the whole program.' },
  ];

  function render(container) {
    container.innerHTML =
      '<section class="page page-landing">' +
        '<div class="hero">' +
          '<img src="icons/cr-mark.png" class="hero-logo animate-in" style="animation-delay:0ms" alt="Crimson Rep" />' +
          '<p class="hero-eyebrow animate-in" style="animation-delay:80ms">TRACK. RANK. PROGRESS.</p>' +
          '<h1 class="hero-headline animate-in" style="animation-delay:160ms">FIND YOUR<br>TRUE MAX.</h1>' +
          '<p class="hero-pitch animate-in" style="animation-delay:240ms">' +
            'Log a set, get an instant 1RM estimate, and see exactly how it stacks up — across 13 lifts, ranked against real strength standards.' +
          '</p>' +
          '<div class="hero-cta animate-in" style="animation-delay:320ms">' +
            '<a href="#/signup" class="btn-primary btn-glow">Get Started</a>' +
            '<a href="#/login" class="btn-ghost">Log In</a>' +
          '</div>' +
        '</div>' +
        '<div class="feature-grid">' +
          FEATURES.map(function (f, i) {
            return (
              '<div class="feature-card animate-in" style="animation-delay:' + (400 + i * 90) + 'ms">' +
                '<div class="feature-icon">' + ICONS[f.icon] + '</div>' +
                '<h3 class="feature-title">' + f.title + '</h3>' +
                '<p class="feature-body">' + f.body + '</p>' +
              '</div>'
            );
          }).join('') +
        '</div>' +
        '<div class="landing-footer-cta animate-in" style="animation-delay:700ms">' +
          '<p>No account juggling, no ads — just your numbers, saved on this device.</p>' +
          '<a href="#/signup" class="btn-primary">Start logging</a>' +
        '</div>' +
      '</section>';
  }

  return { render };
})();
