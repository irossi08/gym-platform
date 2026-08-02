window.App = window.App || {};
App.Components = App.Components || {};

/**
 * An illustrated seedling that grows through six stages as the streak count
 * rises -- bare soil with a seed, then a breaking sprout, a young pair of
 * leaves, a taller several-leaved plant, a budding plant, and finally a
 * flowering/mature one. Soil tones plus the app's existing accent green
 * cover the whole thing naturally, no themed exception needed the way the
 * fire icon's orange/yellow was.
 */
App.Components.StreakIcon = (function () {
  function stageForCount(n) {
    if (n <= 0) return 0;
    if (n <= 2) return 1;
    if (n <= 6) return 2;
    if (n <= 13) return 3;
    if (n <= 29) return 4;
    return 5;
  }

  function leaf(cx, cy, rotation, scale) {
    const rx = (9 * (scale || 1)).toFixed(1);
    const ry = (4.5 * (scale || 1)).toFixed(1);
    return '<ellipse class="seedling-leaf" cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(' + rotation + ' ' + cx + ' ' + cy + ')" />';
  }

  // Drawn last (painted on top) so the soil mound overlaps the base of the
  // stem/seed, reading as "growing out of the ground" rather than floating
  // in front of it.
  const soilHtml =
    '<path class="seedling-soil" d="M4 114 Q50 100 96 114 L96 127 Q50 119 4 127 Z" />' +
    '<path class="seedling-soil-shadow" d="M14 121 Q50 114 86 121 L86 127 Q50 122 14 127 Z" />';

  function render(streakCount) {
    const n = Math.max(0, parseInt(streakCount, 10) || 0);
    const stage = stageForCount(n);

    let plantHtml;

    if (stage === 0) {
      // Bare soil, seed visible just under the surface -- not sprouted yet.
      plantHtml = '<ellipse class="seedling-seed" cx="50" cy="111" rx="5" ry="3.5" />';
    } else if (stage === 1) {
      // Small sprout breaking through the soil, tip just curling open.
      plantHtml =
        '<path class="seedling-stem" d="M50 114 Q47 101 51 92" />' +
        leaf(53.5, 91, -25, 0.5) +
        leaf(48.5, 90.5, 200, 0.45);
    } else if (stage === 2) {
      // Young seedling, one pair of leaves.
      plantHtml =
        '<path class="seedling-stem" d="M50 114 Q48 94 50 78" />' +
        leaf(59, 81, -20, 0.85) +
        leaf(41, 81, 200, 0.85);
    } else if (stage === 3) {
      // Taller young plant, several leaves along the stem.
      plantHtml =
        '<path class="seedling-stem" d="M50 114 Q46 92 50 60" />' +
        leaf(60, 97, -15, 0.8) +
        leaf(40, 97, 195, 0.8) +
        leaf(61, 78, -25, 0.9) +
        leaf(39, 78, 205, 0.9) +
        leaf(58, 62, -10, 0.7) +
        leaf(42, 62, 190, 0.7);
    } else if (stage === 4) {
      // Fuller plant, starting to bud.
      plantHtml =
        '<path class="seedling-stem" d="M50 114 Q44 90 50 42" />' +
        leaf(62, 99, -15, 0.95) +
        leaf(38, 99, 195, 0.95) +
        leaf(64, 79, -25, 1) +
        leaf(36, 79, 205, 1) +
        leaf(60, 59, -15, 0.85) +
        leaf(40, 59, 195, 0.85) +
        '<ellipse class="seedling-bud" cx="50" cy="40" rx="6" ry="9" />';
    } else {
      // Flowering / mature.
      const petals = [0, 60, 120, 180, 240, 300].map(function (angle) {
        return '<ellipse class="seedling-petal" cx="50" cy="19" rx="5" ry="9.5" transform="rotate(' + angle + ' 50 28)" />';
      }).join('');
      plantHtml =
        '<path class="seedling-stem" d="M50 114 Q42 88 50 30" />' +
        leaf(63, 99, -15, 1) +
        leaf(37, 99, 195, 1) +
        leaf(65, 77, -25, 1.05) +
        leaf(35, 77, 205, 1.05) +
        leaf(60, 55, -15, 0.9) +
        leaf(40, 55, 195, 0.9) +
        petals +
        '<circle class="seedling-flower-center" cx="50" cy="28" r="6" />';
    }

    return (
      '<svg viewBox="0 0 100 130" class="streak-icon" role="img" aria-label="' + n + ' day streak">' +
        plantHtml +
        soilHtml +
      '</svg>'
    );
  }

  return { render };
})();
