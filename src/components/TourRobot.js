window.App = window.App || {};
App.Components = App.Components || {};

/**
 * The onboarding tour's mascot: a small friendly robot, built entirely from
 * the app's own dark-surface/border/accent-green palette so it reads as
 * part of the app rather than a dropped-in clip-art character.
 */
App.Components.TourRobot = (function () {
  function render() {
    return (
      '<svg viewBox="0 0 80 90" class="tour-robot-svg" role="img" aria-label="Tour guide robot">' +
        '<line x1="40" y1="4" x2="40" y2="16" class="tour-robot-antenna" />' +
        '<circle cx="40" cy="4" r="4" class="tour-robot-antenna-tip" />' +
        '<rect x="14" y="16" width="52" height="38" rx="12" class="tour-robot-head" />' +
        '<rect x="22" y="28" width="36" height="16" rx="8" class="tour-robot-visor" />' +
        '<circle cx="32" cy="36" r="3.4" class="tour-robot-eye" />' +
        '<circle cx="48" cy="36" r="3.4" class="tour-robot-eye" />' +
        '<rect x="10" y="30" width="6" height="14" rx="3" class="tour-robot-ear" />' +
        '<rect x="64" y="30" width="6" height="14" rx="3" class="tour-robot-ear" />' +
        '<rect x="18" y="56" width="44" height="30" rx="10" class="tour-robot-body" />' +
        '<circle cx="40" cy="71" r="7" class="tour-robot-chip" />' +
        '<path d="M40 66 L40 76 M35 71 L45 71" class="tour-robot-chip-cross" />' +
      '</svg>'
    );
  }

  return { render };
})();
