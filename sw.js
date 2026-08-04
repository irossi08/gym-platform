// Crimson Rep service worker -- app-shell caching only.
//
// Deliberately NOT a general offline-data cache: only same-origin GET
// requests for the static app shell (this file list) ever get cached.
// Supabase, Mapbox, and Google Fonts requests always go straight to the
// network, untouched -- caching those would risk serving stale auth
// state, stale friend/community data, or a stale map, which is exactly
// the kind of "functional change" this feature is explicitly not meant
// to introduce. The only promise here is: if you've loaded the app
// before, a brief connectivity drop (or a full offline reload) still
// gets you the app shell instead of a blank/broken page -- the data
// layer still needs a live connection, same as it always has.
//
// IMPORTANT MAINTENANCE NOTE: bump CACHE_VERSION every time any file in
// PRECACHE_URLS changes (which, in practice, means most feature commits).
// Browsers only re-check an installed service worker by comparing this
// file's own bytes -- if this string doesn't change, the browser has no
// way to know the precached files are stale, and anyone with the PWA
// already installed keeps getting the old cached version indefinitely.
const CACHE_VERSION = 'crimson-rep-v3';

const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',

  './src/lib/supabaseClient.js',
  './src/lib/mapboxClient.js',
  './src/lib/units.js',
  './src/lib/theme.js',
  './src/lib/oneRepMax.js',
  './src/lib/standards.js',
  './src/lib/exerciseInfo.js',
  './src/lib/exercisePool.js',
  './src/lib/auth.js',
  './src/lib/storage.js',
  './src/lib/splitBuilder.js',
  './src/lib/schedule.js',
  './src/lib/goals.js',
  './src/lib/exerciseLibrary.js',
  './src/lib/social.js',
  './src/lib/communities.js',
  './src/lib/challenges.js',
  './src/lib/tourSteps.js',
  './src/lib/achievementTourSteps.js',

  './src/components/Navbar.js',
  './src/components/MovementAnimation.js',
  './src/components/ExerciseInfoPanel.js',
  './src/components/ExercisePicker.js',
  './src/components/StreakIcon.js',
  './src/components/MedalIcon.js',
  './src/components/PresetAvatars.js',
  './src/components/Avatar.js',
  './src/components/Toast.js',
  './src/components/FriendsBadge.js',
  './src/components/FriendProfileModal.js',
  './src/components/FriendsPanel.js',
  './src/components/FriendRequestToast.js',
  './src/components/GymAutoComplete.js',
  './src/components/WorkoutCompleteModal.js',
  './src/components/RestTimer.js',
  './src/components/ProfileForm.js',
  './src/components/ProfileEditModal.js',
  './src/components/StreakBadge.js',
  './src/components/QuickLinks.js',
  './src/components/StreakModal.js',
  './src/components/ChallengeForm.js',
  './src/components/GoalCelebration.js',
  './src/components/TourRobot.js',
  './src/components/TourOverlay.js',
  './src/components/GoalChart.js',
  './src/components/ProgressChart.js',
  './src/components/LiftForm.js',
  './src/components/ResultPanel.js',
  './src/components/StandardsGauge.js',
  './src/components/HistoryList.js',
  './src/components/TrendChart.js',

  './src/pages/Landing.js',
  './src/pages/Auth.js',
  './src/pages/ProfileSetup.js',
  './src/pages/Home.js',
  './src/pages/OneRepMax.js',
  './src/pages/History.js',
  './src/pages/SplitBuilder.js',
  './src/pages/Achievements.js',
  './src/pages/Settings.js',
  './src/pages/Community.js',
  './src/pages/CommunityDetail.js',
  './src/pages/ChallengeDetail.js',

  './src/router.js',
  './src/app.js',

  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(function (cache) { return cache.addAll(PRECACHE_URLS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE_VERSION; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  const url = new URL(req.url);

  // Only same-origin GETs are ever handled here -- everything else
  // (Supabase, Mapbox, Google Fonts, any non-GET) is left completely
  // alone and goes straight to the network.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      const networkFetch = fetch(req).then(function (response) {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, copy); });
        }
        return response;
      }).catch(function () {
        // Offline and this exact request was never cached -- for a page
        // navigation, fall back to the cached app shell rather than the
        // browser's own offline error page. This app is a single-page,
        // hash-routed app, so index.html IS every "page".
        if (req.mode === 'navigate') return caches.match('./index.html');
        return undefined;
      });
      return cached || networkFetch;
    })
  );
});
