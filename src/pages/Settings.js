window.App = window.App || {};
App.Pages = App.Pages || {};

App.Pages.Settings = (function () {
  // Background, surface/card, and text are fixed (black/near-black/white)
  // -- only the accent is customizable here.
  const COLOR_FIELDS = [
    { key: 'accent', id: 'set-accent', label: 'Accent' },
  ];

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

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

  function gymLocationsListHtml(locations) {
    return locations.length
      ? '<ul class="community-list">' +
          locations.map(function (loc) {
            return (
              '<li class="community-list-item">' +
                '<span class="community-list-name">' + escapeHtml(loc.name) + '</span>' +
                '<button type="button" class="btn-ghost-sm gym-location-remove-btn" data-id="' + loc.id + '">Remove</button>' +
              '</li>'
            );
          }).join('') +
        '</ul>'
      : '<p class="empty-hint">No gym locations saved yet.</p>';
  }

  function refreshGymLocationsList(container, user) {
    const listEl = container.querySelector('#gym-locations-list');
    listEl.innerHTML = gymLocationsListHtml(App.Storage.getGymLocations(user.id));
    listEl.querySelectorAll('.gym-location-remove-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        App.Storage.deleteGymLocation(user.id, btn.dataset.id);
        refreshGymLocationsList(container, user);
      });
    });
  }

  function wireGymLocations(container, user) {
    refreshGymLocationsList(container, user);

    const addBtn = container.querySelector('#gym-location-add-btn');
    const addSlot = container.querySelector('#gym-location-add-slot');

    addBtn.addEventListener('click', function () {
      if (addSlot.dataset.open) { addSlot.innerHTML = ''; addSlot.dataset.open = ''; return; }
      addSlot.dataset.open = '1';
      renderGymLocationAddForm(addSlot, user, function () {
        addSlot.innerHTML = '';
        addSlot.dataset.open = '';
        refreshGymLocationsList(container, user);
        App.Components.GymAutoComplete.init(user);
      });
    });
  }

  // Address search (Mapbox Geocoding) or pick-on-map (fixed center pin --
  // simpler and more reliable than implementing a draggable marker: the
  // user pans/zooms the map until the pin sits where they want, same
  // interaction Uber/Instagram use for "drop a pin").
  function renderGymLocationAddForm(addSlot, user, onSaved) {
    if (!App.Mapbox.isConfigured()) {
      addSlot.innerHTML = '<p class="field-error">Gym location search needs a Mapbox access token configured first (see the setup steps you were given for this feature).</p>';
      return;
    }

    addSlot.innerHTML =
      '<div class="community-inline-form">' +
        '<div class="goal-type-toggle">' +
          '<button type="button" class="goal-type-btn goal-type-btn--active" data-mode="search">Search address</button>' +
          '<button type="button" class="goal-type-btn" data-mode="map">Pick on map</button>' +
        '</div>' +
        '<div id="gym-loc-search-panel">' +
          '<div class="field-row">' +
            '<div class="field"><input type="text" id="gym-loc-search-input" placeholder="Search for your gym’s address…" /></div>' +
            '<button type="button" class="btn-ghost-sm" id="gym-loc-search-btn">Search</button>' +
          '</div>' +
          '<div id="gym-loc-search-results"></div>' +
        '</div>' +
        '<div id="gym-loc-map-panel" hidden>' +
          '<p class="field-hint">Pan and zoom the map so the pin sits on your gym, then confirm below.</p>' +
          '<div class="gym-loc-map-wrap">' +
            '<div id="gym-loc-map" class="gym-loc-map"></div>' +
            '<div class="gym-loc-map-pin">📍</div>' +
          '</div>' +
          '<button type="button" class="btn-ghost-sm" id="gym-loc-map-use-btn">Use map center</button>' +
        '</div>' +
        '<div id="gym-loc-name-panel" hidden>' +
          '<div class="field"><label for="gym-loc-name-input">Name this location</label><input type="text" id="gym-loc-name-input" placeholder="e.g. Downtown Gym" /></div>' +
          '<button type="button" class="btn-primary" id="gym-loc-save-btn">Save location</button>' +
        '</div>' +
        '<p class="field-error" id="gym-loc-error"></p>' +
      '</div>';

    let pendingLocation = null;
    let mapInstance = null;

    const searchPanel = addSlot.querySelector('#gym-loc-search-panel');
    const mapPanel = addSlot.querySelector('#gym-loc-map-panel');
    const namePanel = addSlot.querySelector('#gym-loc-name-panel');
    const errorEl = addSlot.querySelector('#gym-loc-error');

    addSlot.querySelectorAll('[data-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        addSlot.querySelectorAll('[data-mode]').forEach(function (b) { b.classList.toggle('goal-type-btn--active', b === btn); });
        const mode = btn.dataset.mode;
        searchPanel.hidden = mode !== 'search';
        mapPanel.hidden = mode !== 'map';
        namePanel.hidden = true;
        if (mode === 'map' && !mapInstance) {
          mapInstance = new window.mapboxgl.Map({
            container: addSlot.querySelector('#gym-loc-map'),
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [-98.5, 39.8],
            zoom: 3,
          });
        }
      });
    });

    addSlot.querySelector('#gym-loc-search-btn').addEventListener('click', function () {
      const query = addSlot.querySelector('#gym-loc-search-input').value.trim();
      const resultsEl = addSlot.querySelector('#gym-loc-search-results');
      errorEl.textContent = '';
      namePanel.hidden = true;
      if (!query) { errorEl.textContent = 'Enter an address or place name.'; return; }
      resultsEl.innerHTML = '<p class="empty-hint">Searching…</p>';
      App.Mapbox.geocode(query).then(function (results) {
        resultsEl.innerHTML = results.length
          ? '<ul class="community-list">' +
              results.map(function (r, i) {
                return (
                  '<li class="community-list-item">' +
                    '<button type="button" class="btn-ghost-sm gym-loc-result-btn" data-index="' + i + '">' + escapeHtml(r.name) + '</button>' +
                  '</li>'
                );
              }).join('') +
            '</ul>'
          : '<p class="empty-hint">No results found.</p>';
        resultsEl.querySelectorAll('.gym-loc-result-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            const r = results[parseInt(btn.dataset.index, 10)];
            pendingLocation = { lat: r.lat, lng: r.lng };
            addSlot.querySelector('#gym-loc-name-input').value = r.name;
            namePanel.hidden = false;
          });
        });
      }).catch(function () {
        resultsEl.innerHTML = '';
        errorEl.textContent = 'Search failed. Please try again.';
      });
    });

    addSlot.querySelector('#gym-loc-map-use-btn').addEventListener('click', function () {
      if (!mapInstance) return;
      const center = mapInstance.getCenter();
      pendingLocation = { lat: center.lat, lng: center.lng };
      addSlot.querySelector('#gym-loc-name-input').value = '';
      errorEl.textContent = '';
      namePanel.hidden = false;
    });

    addSlot.querySelector('#gym-loc-save-btn').addEventListener('click', function () {
      const name = addSlot.querySelector('#gym-loc-name-input').value.trim();
      if (!name) { errorEl.textContent = 'Give this location a name.'; return; }
      if (!pendingLocation) { errorEl.textContent = 'Choose a location first.'; return; }
      App.Storage.addGymLocation(user.id, { name: name, lat: pendingLocation.lat, lng: pendingLocation.lng });
      onSaved();
    });
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
          '<div class="card" id="settings-gym-locations-card">' +
            '<h2 class="section-title">Gym Locations</h2>' +
            '<p class="field-hint">Save a gym here to auto-complete today’s workout when you’re within about 75 meters of it. ' +
              'This only works while the app is actually open in your browser — phones and browsers don’t allow true background ' +
              'location tracking the way a native app can, so if the app is closed it won’t auto-detect until you open it again. ' +
              'You’ll get a clear notice on screen whenever it fires.</p>' +
            '<div id="gym-locations-list">' + gymLocationsListHtml(App.Storage.getGymLocations(user.id)) + '</div>' +
            '<button type="button" class="btn-ghost-sm" id="gym-location-add-btn">Add a gym location</button>' +
            '<div id="gym-location-add-slot"></div>' +
          '</div>' +
          '<button type="button" class="btn-ghost settings-reset-btn" id="settings-reset">Reset to default theme</button>' +
        '</section>';

      App.Components.StreakBadge.render(container.querySelector('#settings-streak-badge'), user);
      App.Components.QuickLinks.render(container.querySelector('#settings-quick-links'), user, 'settings');
      wireGymLocations(container, user);

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
