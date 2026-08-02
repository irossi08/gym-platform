window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Custom two-tone medal badge (ribbon + circle + star), tiered
 * bronze/silver/gold/platinum for Novice/Intermediate/Advanced/Elite. Elite
 * gets a subtle accent-green glow, tying the app's top tier back to its
 * theme color without touching the other three.
 */
App.Components.MedalIcon = (function () {
  const TIER_LABELS = { novice: 'Novice', intermediate: 'Intermediate', advanced: 'Advanced', elite: 'Elite' };

  function render(tier) {
    const safeTier = TIER_LABELS[tier] ? tier : 'novice';
    const label = TIER_LABELS[safeTier];
    return (
      '<svg viewBox="0 0 60 84" class="medal-icon medal-icon--' + safeTier + '" role="img" aria-label="' + label + ' medal">' +
        '<path class="medal-ribbon" d="M22 4 L30 40 L14 40 Z" />' +
        '<path class="medal-ribbon" d="M38 4 L46 40 L30 40 Z" />' +
        '<circle class="medal-outer" cx="30" cy="52" r="26" />' +
        '<circle class="medal-inner" cx="30" cy="52" r="19" />' +
        '<path class="medal-star" d="M30 40 L33.5 48.5 L43 49.3 L35.8 55.5 L38 65 L30 59.7 L22 65 L24.2 55.5 L17 49.3 L26.5 48.5 Z" />' +
      '</svg>'
    );
  }

  return { render, TIER_LABELS };
})();
