window.App = window.App || {};
App.Components = App.Components || {};

App.Components.ExerciseInfoPanel = (function () {
  function muscleChip(name, isPrimary) {
    return '<span class="muscle-chip' + (isPrimary ? ' muscle-chip--primary' : '') + '">' + name + '</span>';
  }

  function render(container, liftKey, userId) {
    const info = App.ExerciseLibrary.info(liftKey, userId);
    if (!info) {
      container.innerHTML = '';
      return;
    }

    const secondaryHtml = info.secondary.length
      ? '<div class="info-muscle-group"><span class="info-muscle-label">Secondary</span>' +
          info.secondary.map(function (m) { return muscleChip(m, false); }).join('') +
        '</div>'
      : '';

    container.innerHTML =
      '<div class="info-panel">' +
        '<div class="info-anim">' + App.Components.MovementAnimation.render(info.pattern) + '</div>' +
        '<div class="info-text">' +
          '<h3 class="info-exercise-name">' + App.ExerciseLibrary.label(liftKey, userId) + '</h3>' +
          '<p class="info-description">' + info.description + '</p>' +
          '<div class="info-muscles">' +
            '<div class="info-muscle-group"><span class="info-muscle-label">Primary</span>' +
              info.primary.map(function (m) { return muscleChip(m, true); }).join('') +
            '</div>' +
            secondaryHtml +
          '</div>' +
        '</div>' +
      '</div>';
  }

  return { render };
})();
