window.App = window.App || {};
App.Pages = App.Pages || {};

App.Pages.Settings = (function () {
  // Background, surface/card, and text are fixed (black/near-black/white)
  // -- only the accent is customizable here.
  const COLOR_FIELDS = [
    { key: 'accent', id: 'set-accent', label: 'Accent' },
  ];

  function colorFieldHtml(field, value) {
    return (
      '<div class="settings-color-field">' +
        '<label for="' + field.id + '">' + field.label + '</label>' +
        '<div class="settings-color-input-wrap">' +
          '<input type="color" id="' + field.id + '" data-key="' + field.key + '" value="' + value + '" />' +
          '<span class="settings-color-hex">' + value + '</span>' +
        '</div>' +
      '</div>'
    );
  }

  function toggleGroupHtml(group, options, current) {
    return (
      '<div class="unit-toggle settings-toggle" data-group="' + group + '" role="group">' +
        options.map(function (opt) {
          const active = opt.value === current ? ' unit-toggle-btn--active' : '';
          return '<button type="button" class="unit-toggle-btn' + active + '" data-value="' + opt.value + '">' + opt.label + '</button>';
        }).join('') +
      '</div>'
    );
  }

  function render(container, opts) {
    const user = opts.user;
    let theme = Object.assign({}, App.Theme.DEFAULTS, App.Storage.getTheme(user.id));

    function persist() {
      App.Storage.saveTheme(user.id, theme);
      App.Theme.applyTheme(theme);
    }

    function renderBody() {
      container.innerHTML =
        '<section class="page page-settings">' +
          '<div class="page-header">' +
            '<div class="page-title-row"><h1 class="page-title">Settings</h1><div id="settings-streak-badge"></div></div>' +
          '</div>' +
          '<div id="settings-quick-links"></div>' +
          '<div class="card" id="settings-colors-card">' +
            '<h2 class="section-title">Colors</h2>' +
            COLOR_FIELDS.map(function (f) { return colorFieldHtml(f, theme[f.key]); }).join('') +
          '</div>' +
          '<div class="card" id="settings-layout-card">' +
            '<h2 class="section-title">Layout</h2>' +
            '<div class="settings-layout-field">' +
              '<p class="settings-layout-label">Spacing</p>' +
              toggleGroupHtml('density', [
                { value: 'spacious', label: 'Spacious' },
                { value: 'compact', label: 'Compact' },
              ], theme.density) +
            '</div>' +
            '<div class="settings-layout-field">' +
              '<p class="settings-layout-label">Data views (History, Achievements, exercise pickers)</p>' +
              toggleGroupHtml('viewStyle', [
                { value: 'list', label: 'List' },
                { value: 'card', label: 'Cards' },
              ], theme.viewStyle) +
            '</div>' +
            '<div class="settings-layout-field">' +
              '<p class="settings-layout-label">Font size</p>' +
              toggleGroupHtml('fontSize', [
                { value: 'small', label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large', label: 'Large' },
              ], theme.fontSize) +
            '</div>' +
          '</div>' +
          '<button type="button" class="btn-ghost settings-reset-btn" id="settings-reset">Reset to default theme</button>' +
        '</section>';

      App.Components.StreakBadge.render(container.querySelector('#settings-streak-badge'), user);
      App.Components.QuickLinks.render(container.querySelector('#settings-quick-links'), user, 'settings');

      // Live preview: applied on every 'input' event (fires continuously
      // while dragging inside the native color picker), never via a full
      // rebuild of this page -- only the hex readout text is patched
      // directly, so nothing here can steal focus mid-pick.
      container.querySelectorAll('.settings-color-input-wrap input[type="color"]').forEach(function (input) {
        input.addEventListener('input', function () {
          theme[input.dataset.key] = input.value;
          input.nextElementSibling.textContent = input.value;
          persist();
        });
      });

      container.querySelectorAll('.settings-toggle').forEach(function (group) {
        const key = group.dataset.group;
        group.querySelectorAll('.unit-toggle-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            if (btn.dataset.value === theme[key]) return;
            theme[key] = btn.dataset.value;
            group.querySelectorAll('.unit-toggle-btn').forEach(function (b) {
              b.classList.toggle('unit-toggle-btn--active', b === btn);
            });
            persist();
          });
        });
      });

      container.querySelector('#settings-reset').addEventListener('click', function () {
        theme = Object.assign({}, App.Theme.DEFAULTS);
        App.Storage.saveTheme(user.id, theme);
        App.Theme.applyTheme(theme);
        renderBody();
      });
    }

    renderBody();
  }

  return { render };
})();
