window.App = window.App || {};
App.Pages = App.Pages || {};

App.Pages.Settings = (function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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

  // Address search and the map are ONE connected flow, not two separate
  // pickers: picking a search result drops an actual draggable Mapbox
  // marker at that spot (flying the map there too), which can then be
  // dragged to fine-tune, or the map can just be clicked directly to place/
  // move the marker without searching at all. The marker's current
  // position, whichever way it got there, is what gets saved.
  function renderGymLocationAddForm(addSlot, user, onSaved) {
    if (!App.Mapbox.isConfigured()) {
      addSlot.innerHTML = '<p class="field-error">Gym location search needs a Mapbox access token configured first (see the setup steps you were given for this feature).</p>';
      return;
    }

    addSlot.innerHTML =
      '<div class="community-inline-form">' +
        '<div class="field gym-loc-search-field">' +
          '<input type="text" id="gym-loc-search-input" placeholder="Search by gym name (e.g. “Gym Group Walthamstow”) or address…" autocomplete="off" />' +
          '<div id="gym-loc-search-results" class="gym-loc-suggestions" hidden></div>' +
        '</div>' +
        '<p class="field-hint">Pick a result to drop the pin there, or click anywhere on the map to place it yourself. Drag the pin to fine-tune it.</p>' +
        '<div class="gym-loc-map-wrap">' +
          '<div id="gym-loc-map" class="gym-loc-map"></div>' +
        '</div>' +
        '<div id="gym-loc-name-panel" hidden>' +
          '<div class="field"><label for="gym-loc-name-input">Name this location</label><input type="text" id="gym-loc-name-input" placeholder="e.g. Downtown Gym" /></div>' +
          '<button type="button" class="btn-primary" id="gym-loc-save-btn">Save location</button>' +
        '</div>' +
        '<p class="field-error" id="gym-loc-error"></p>' +
      '</div>';

    let pendingLocation = null;
    let marker = null;
    let sessionToken = App.Mapbox.newSessionToken();
    let debounceTimer = null;
    let latestQuery = '';

    const namePanel = addSlot.querySelector('#gym-loc-name-panel');
    const errorEl = addSlot.querySelector('#gym-loc-error');
    const searchInput = addSlot.querySelector('#gym-loc-search-input');
    const resultsEl = addSlot.querySelector('#gym-loc-search-results');

    const mapInstance = new window.mapboxgl.Map({
      container: addSlot.querySelector('#gym-loc-map'),
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [-98.5, 39.8],
      zoom: 3,
    });

    function placeMarker(lng, lat) {
      pendingLocation = { lat: lat, lng: lng };
      errorEl.textContent = '';
      namePanel.hidden = false;
      if (!marker) {
        marker = new window.mapboxgl.Marker({ draggable: true }).setLngLat([lng, lat]).addTo(mapInstance);
        marker.on('dragend', function () {
          const pos = marker.getLngLat();
          pendingLocation = { lat: pos.lat, lng: pos.lng };
        });
      } else {
        marker.setLngLat([lng, lat]);
      }
    }

    mapInstance.on('click', function (e) {
      placeMarker(e.lngLat.lng, e.lngLat.lat);
    });

    // Live suggestions as-you-type (Search Box API), not a search button --
    // debounced so it doesn't fire a request on every single keystroke.
    // Matches by business/place name (e.g. a gym chain + area) as well as
    // addresses, unlike the old Geocoding-API address search this replaced.
    searchInput.addEventListener('input', function () {
      const query = searchInput.value.trim();
      clearTimeout(debounceTimer);
      if (!query) { resultsEl.hidden = true; resultsEl.innerHTML = ''; return; }
      debounceTimer = setTimeout(function () { runSuggest(query); }, 300);
    });

    function runSuggest(query) {
      latestQuery = query;
      resultsEl.hidden = false;
      resultsEl.innerHTML = '<p class="empty-hint">Searching…</p>';
      App.Mapbox.suggest(query, sessionToken).then(function (suggestions) {
        if (query !== latestQuery) return; // a newer keystroke's request already landed
        resultsEl.innerHTML = suggestions.length
          ? '<ul class="community-list">' +
              suggestions.map(function (s, i) {
                return (
                  '<li class="community-list-item">' +
                    '<button type="button" class="btn-ghost-sm gym-loc-result-btn" data-index="' + i + '">' +
                      '<span class="gym-loc-suggestion-name">' + escapeHtml(s.name) + '</span>' +
                      (s.placeFormatted ? '<span class="gym-loc-suggestion-address">' + escapeHtml(s.placeFormatted) + '</span>' : '') +
                    '</button>' +
                  '</li>'
                );
              }).join('') +
            '</ul>'
          : '<p class="empty-hint">No results found.</p>';
        resultsEl.querySelectorAll('.gym-loc-result-btn').forEach(function (btn) {
          btn.addEventListener('click', function () {
            const s = suggestions[parseInt(btn.dataset.index, 10)];
            App.Mapbox.retrieve(s.mapboxId, sessionToken).then(function (feature) {
              if (!feature) { errorEl.textContent = 'Could not load that location. Please try again.'; return; }
              mapInstance.flyTo({ center: [feature.lng, feature.lat], zoom: 16 });
              placeMarker(feature.lng, feature.lat);
              addSlot.querySelector('#gym-loc-name-input').value = s.name;
              searchInput.value = s.name;
              resultsEl.hidden = true;
              resultsEl.innerHTML = '';
              sessionToken = App.Mapbox.newSessionToken(); // fresh token for the next search
            });
          });
        });
      }).catch(function () {
        if (query !== latestQuery) return;
        resultsEl.innerHTML = '';
        errorEl.textContent = 'Search failed. Please try again.';
      });
    }

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
            '<h2 class="section-title">Appearance</h2>' +
            '<div class="settings-layout-field">' +
              '<p class="settings-layout-label">Mode</p>' +
              toggleGroupHtml('mode', [
                { value: 'dark', label: 'Dark' },
                { value: 'light', label: 'Light' },
              ], theme.mode) +
            '</div>' +
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
          '<button type="button" class="btn-ghost settings-reset-btn" id="settings-reset">Reset to default appearance</button>' +
        '</section>';

      App.Components.StreakBadge.render(container.querySelector('#settings-streak-badge'), user);
      App.Components.QuickLinks.render(container.querySelector('#settings-quick-links'), user, 'settings');
      wireGymLocations(container, user);

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
