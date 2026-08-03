window.App = window.App || {};

/**
 * Mapbox integration for saved gym locations: address search (Geocoding
 * REST API, plain fetch, no SDK needed for that part) and the pin-drop map
 * (Mapbox GL JS, loaded via CDN in index.html). Same trust model as
 * supabaseClient.js -- this token is embedded in public client code, same
 * as the Supabase publishable key already is. Restrict it to your own
 * domain(s) from your Mapbox account's Tokens page (URL restrictions) so
 * it can't be reused elsewhere even though it's visible in this file.
 */
App.Mapbox = (function () {
  // TODO: paste your Mapbox access token here -- see the setup steps
  // provided alongside this feature.
  const ACCESS_TOKEN = 'YOUR_MAPBOX_ACCESS_TOKEN';

  if (window.mapboxgl) window.mapboxgl.accessToken = ACCESS_TOKEN;

  function isConfigured() {
    return !!ACCESS_TOKEN && ACCESS_TOKEN !== 'YOUR_MAPBOX_ACCESS_TOKEN';
  }

  // Forward geocoding: free-text address/place query -> up to 5 candidate
  // {name, lat, lng} matches, best match first.
  function geocode(query) {
    if (!isConfigured()) return Promise.reject(new Error('Mapbox access token not configured.'));
    const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(query) +
      '.json?access_token=' + ACCESS_TOKEN + '&limit=5';
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('Geocoding request failed (' + res.status + ').');
      return res.json();
    }).then(function (data) {
      return (data.features || []).map(function (f) {
        return { name: f.place_name, lat: f.center[1], lng: f.center[0] };
      });
    });
  }

  return { ACCESS_TOKEN: ACCESS_TOKEN, isConfigured: isConfigured, geocode: geocode };
})();
