window.App = window.App || {};
App.Components = App.Components || {};

/**
 * Auto-completes today's scheduled workout when the user's device is
 * within ~75m of one of their saved gym locations. Only works while this
 * tab/app is actually open and in the foreground -- browsers have no true
 * background-tracking API the way a native app would, so this is a
 * foreground watch (navigator.geolocation.watchPosition), not silent
 * 24/7 tracking. Session-lifetime singleton, same init/stop lifecycle as
 * FriendRequestToast: init() from app.js at boot (if already logged in)
 * and Auth.js right after login/signup, stop() from Navbar logout.
 *
 * No-ops entirely if the user has no saved gym locations -- there's
 * nothing to check position against, and this avoids prompting for
 * location permission before they've opted into the feature at all (see
 * Settings.js's Gym Locations section).
 */
App.Components.GymAutoComplete = (function () {
  const THRESHOLD_METERS = 75;
  let watchId = null;

  // Haversine great-circle distance in meters.
  function distanceMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const toRad = function (d) { return (d * Math.PI) / 180; };
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function handlePosition(user, position) {
    const locations = App.Storage.getGymLocations(user.id);
    if (locations.length === 0) return;

    const split = App.Storage.getSplit(user.id);
    if (!split) return;
    const todayWd = App.Schedule.todayWeekday();
    const day = split.days.find(function (d) { return d.weekday === todayWd; });
    if (!day) return; // rest day -- nothing scheduled to auto-complete

    const todayKey = App.Schedule.dateKey(new Date());
    if (App.Schedule.isCompleted(user.id, todayKey)) return; // already done, manually or auto

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const nearby = locations.find(function (loc) { return distanceMeters(lat, lng, loc.lat, loc.lng) <= THRESHOLD_METERS; });
    if (!nearby) return;

    App.Schedule.setCompleted(user.id, todayKey, todayWd, true, { autoDetected: true });
    App.Components.Toast.show('📍 Auto-completed today’s workout — detected at ' + nearby.name, 6000);
  }

  function init(user) {
    stop();
    if (!('geolocation' in navigator)) return;
    if (App.Storage.getGymLocations(user.id).length === 0) return;

    watchId = navigator.geolocation.watchPosition(
      function (position) { handlePosition(user, position); },
      function (err) { console.warn('[GymAutoComplete] geolocation error:', err.message); },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 20000 }
    );
  }

  function stop() {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  }

  return { init, stop, distanceMeters };
})();
