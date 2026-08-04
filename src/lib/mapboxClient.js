window.App = window.App || {};

/**
 * Mapbox integration for saved gym locations: place search (Search Box
 * API, plain fetch, no SDK needed for that part) and the pin-drop map
 * (Mapbox GL JS, loaded via CDN in index.html). Same trust model as
 * supabaseClient.js -- this token is embedded in public client code, same
 * as the Supabase publishable key already is. Restrict it to your own
 * domain(s) from your Mapbox account's Tokens page (URL restrictions) so
 * it can't be reused elsewhere even though it's visible in this file.
 *
 * Uses the Search Box API (suggest + retrieve), not the older Geocoding
 * API -- Geocoding is address/postcode-oriented and ranks business/POI
 * names (e.g. "Gym Group Walthamstow") poorly; Search Box is Mapbox's
 * purpose-built product for exactly this "type a business name, see live
 * suggestions, pick one" flow, the same one Google/Apple Maps use. It's
 * session-based: newSessionToken() should be called once when a search
 * flow starts and reused across suggest()+retrieve() calls until a result
 * is picked (or the search is abandoned), then a fresh token generated for
 * the next search -- that's how Mapbox scopes billing for the flow.
 */
App.Mapbox = (function () {
  const ACCESS_TOKEN = 'pk.eyJ1IjoiaXJvc3NpMDgiLCJhIjoiY21zZHhld3dhMDJndjJ6c2FraWxldXh1NyJ9.cqNo6pYh4B5d8jldHfpIaA';

  if (window.mapboxgl) window.mapboxgl.accessToken = ACCESS_TOKEN;

  function isConfigured() {
    return !!ACCESS_TOKEN && ACCESS_TOKEN !== 'YOUR_MAPBOX_ACCESS_TOKEN';
  }

  function newSessionToken() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'session_' + Date.now() + '_' + Math.random().toString(16).slice(2);
  }

  // Lightweight suggestions as the user types -- {mapboxId, name,
  // placeFormatted}, no coordinates yet (that's what retrieve() is for).
  // Deliberately no `types` filter: Search Box's own relevance ranking
  // already blends POIs (business/place names) with addresses, which is
  // exactly the "search a gym by name, or fall back to its address" both
  // ways this needs to work.
  function suggest(query, sessionToken) {
    if (!isConfigured()) return Promise.reject(new Error('Mapbox access token not configured.'));
    const url = 'https://api.mapbox.com/search/searchbox/v1/suggest?q=' + encodeURIComponent(query) +
      '&access_token=' + ACCESS_TOKEN + '&session_token=' + sessionToken + '&limit=6';
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('Search request failed (' + res.status + ').');
      return res.json();
    }).then(function (data) {
      return (data.suggestions || []).map(function (s) {
        return { mapboxId: s.mapbox_id, name: s.name, placeFormatted: s.place_formatted || s.full_address || '' };
      });
    });
  }

  // Resolves a suggestion (by its mapboxId) to actual coordinates, once
  // the user has picked one from the dropdown.
  function retrieve(mapboxId, sessionToken) {
    if (!isConfigured()) return Promise.reject(new Error('Mapbox access token not configured.'));
    const url = 'https://api.mapbox.com/search/searchbox/v1/retrieve/' + encodeURIComponent(mapboxId) +
      '?access_token=' + ACCESS_TOKEN + '&session_token=' + sessionToken;
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('Retrieve request failed (' + res.status + ').');
      return res.json();
    }).then(function (data) {
      const feature = data.features && data.features[0];
      if (!feature) return null;
      return {
        name: (feature.properties && feature.properties.name) || null,
        lng: feature.geometry.coordinates[0],
        lat: feature.geometry.coordinates[1],
      };
    });
  }

  return { ACCESS_TOKEN: ACCESS_TOKEN, isConfigured: isConfigured, newSessionToken: newSessionToken, suggest: suggest, retrieve: retrieve };
})();
