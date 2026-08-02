window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Reusable, abstract movement-pattern loops shared across all 22
 * exercises (mapped via exerciseInfo.js). Each is a static dashed guide path
 * (the rail/anchor/pivot) plus one moving element (the bar/handle/limb)
 * animated with a pure CSS transform loop — deliberately not anatomical or
 * photo-real, just enough to read as "this is the direction of travel."
 */
App.Components.MovementAnimation = (function () {
  const GUIDE = '#3c3c3c';

  function svgWrap(inner) {
    return '<svg viewBox="0 0 84 84" class="movement-anim" role="img" aria-hidden="true">' + inner + '</svg>';
  }

  const PATTERNS = {
    squat: function () {
      return svgWrap(
        '<line x1="22" y1="14" x2="22" y2="70" stroke="' + GUIDE + '" stroke-width="2" stroke-dasharray="4 4" />' +
        '<line x1="62" y1="14" x2="62" y2="70" stroke="' + GUIDE + '" stroke-width="2" stroke-dasharray="4 4" />' +
        '<line x1="12" y1="76" x2="72" y2="76" stroke="' + GUIDE + '" stroke-width="2" />' +
        '<rect class="move-dot move-dot--squat" x="20" y="20" width="44" height="6" rx="3" style="fill:var(--accent)" />'
      );
    },
    hinge: function () {
      return svgWrap(
        '<line x1="24" y1="18" x2="48" y2="52" stroke="' + GUIDE + '" stroke-width="2" stroke-dasharray="4 4" />' +
        '<line x1="12" y1="66" x2="72" y2="66" stroke="' + GUIDE + '" stroke-width="2" />' +
        '<rect class="move-dot move-dot--hinge" x="20" y="22" width="44" height="6" rx="3" style="fill:var(--accent)" />'
      );
    },
    vertical_push: function () {
      return svgWrap(
        '<line x1="42" y1="12" x2="42" y2="56" stroke="' + GUIDE + '" stroke-width="2" stroke-dasharray="4 4" />' +
        '<line x1="30" y1="56" x2="54" y2="56" stroke="' + GUIDE + '" stroke-width="2" />' +
        '<rect class="move-dot move-dot--vertical_push" x="20" y="48" width="44" height="6" rx="3" style="fill:var(--accent)" />'
      );
    },
    horizontal_push: function () {
      return svgWrap(
        '<line x1="26" y1="42" x2="64" y2="42" stroke="' + GUIDE + '" stroke-width="2" stroke-dasharray="4 4" />' +
        '<line x1="20" y1="20" x2="20" y2="64" stroke="' + GUIDE + '" stroke-width="2" />' +
        '<rect class="move-dot move-dot--horizontal_push" x="32" y="26" width="6" height="32" rx="3" style="fill:var(--accent)" />'
      );
    },
    vertical_pull: function () {
      return svgWrap(
        '<line x1="42" y1="12" x2="42" y2="54" stroke="' + GUIDE + '" stroke-width="2" stroke-dasharray="4 4" />' +
        '<line x1="30" y1="12" x2="54" y2="12" stroke="' + GUIDE + '" stroke-width="2" />' +
        '<rect class="move-dot move-dot--vertical_pull" x="32" y="14" width="20" height="6" rx="3" style="fill:var(--accent)" />'
      );
    },
    horizontal_pull: function () {
      return svgWrap(
        '<line x1="20" y1="36" x2="58" y2="36" stroke="' + GUIDE + '" stroke-width="2" stroke-dasharray="4 4" />' +
        '<line x1="66" y1="20" x2="66" y2="52" stroke="' + GUIDE + '" stroke-width="2" />' +
        '<rect class="move-dot move-dot--horizontal_pull" x="52" y="26" width="6" height="20" rx="3" style="fill:var(--accent)" />'
      );
    },
    isolation_curl: function () {
      return svgWrap(
        '<line x1="54" y1="40" x2="54" y2="58" stroke="' + GUIDE + '" stroke-width="2" />' +
        '<circle cx="54" cy="40" r="3" fill="' + GUIDE + '" />' +
        '<circle class="move-dot move-dot--isolation_curl" cx="54" cy="58" r="6" style="fill:var(--accent)" />'
      );
    },
    isolation_extension: function () {
      return svgWrap(
        '<line x1="34" y1="30" x2="34" y2="50" stroke="' + GUIDE + '" stroke-width="2" />' +
        '<circle cx="34" cy="30" r="3" fill="' + GUIDE + '" />' +
        '<circle class="move-dot move-dot--isolation_extension" cx="34" cy="32" r="6" style="fill:var(--accent)" />'
      );
    },
    leg_curl: function () {
      return svgWrap(
        '<line x1="44" y1="20" x2="44" y2="40" stroke="' + GUIDE + '" stroke-width="2" />' +
        '<circle cx="44" cy="40" r="3" fill="' + GUIDE + '" />' +
        '<circle class="move-dot move-dot--leg_curl" cx="44" cy="58" r="6" style="fill:var(--accent)" />'
      );
    },
    calf_raise: function () {
      return svgWrap(
        '<line x1="42" y1="34" x2="42" y2="66" stroke="' + GUIDE + '" stroke-width="2" stroke-dasharray="4 4" />' +
        '<line x1="16" y1="74" x2="68" y2="74" stroke="' + GUIDE + '" stroke-width="2" />' +
        '<rect class="move-dot move-dot--calf_raise" x="24" y="60" width="36" height="6" rx="3" style="fill:var(--accent)" />'
      );
    },
    hip_thrust: function () {
      return svgWrap(
        '<line x1="14" y1="50" x2="38" y2="50" stroke="' + GUIDE + '" stroke-width="2" />' +
        '<line x1="42" y1="20" x2="42" y2="60" stroke="' + GUIDE + '" stroke-width="2" stroke-dasharray="4 4" />' +
        '<rect class="move-dot move-dot--hip_thrust" x="24" y="46" width="36" height="6" rx="3" style="fill:var(--accent)" />'
      );
    },
    core: function () {
      return svgWrap(
        '<line x1="42" y1="14" x2="42" y2="40" stroke="' + GUIDE + '" stroke-width="2" />' +
        '<circle cx="42" cy="40" r="3" fill="' + GUIDE + '" />' +
        '<circle class="move-dot move-dot--core" cx="42" cy="60" r="6" style="fill:var(--accent)" />'
      );
    },
    shrug: function () {
      return svgWrap(
        '<line x1="12" y1="76" x2="72" y2="76" stroke="' + GUIDE + '" stroke-width="2" />' +
        '<line x1="42" y1="30" x2="42" y2="50" stroke="' + GUIDE + '" stroke-width="2" stroke-dasharray="4 4" />' +
        '<rect class="move-dot move-dot--shrug" x="20" y="46" width="44" height="6" rx="3" style="fill:var(--accent)" />'
      );
    },
  };

  function render(pattern) {
    const fn = PATTERNS[pattern] || PATTERNS.squat;
    return fn();
  }

  return { render };
})();
