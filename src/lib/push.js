window.App = window.App || {};

/**
 * Web Push subscription management -- one combined opt-in (Settings),
 * not a toggle per trigger type; the daily server-side check
 * (api/send-notifications.js) decides which of the two messages (missed
 * today's scheduled workout / streak at risk) applies, if either.
 *
 * VAPID_PUBLIC_KEY is not a secret -- it's sent to the browser on every
 * subscribe() call by design (same trust model as the Supabase/Mapbox
 * public keys already embedded elsewhere in this app). Only the matching
 * PRIVATE key is sensitive, and that one lives solely in the Vercel
 * serverless function's environment variables, never in client code.
 */
App.Push = (function () {
  const VAPID_PUBLIC_KEY = 'BDGnFBmzTTv_yFrdh47IHLTlMMHs21GzWxIQOPnqnXWCOqI1POzIOiBVAOXU5TQx_vE6565BNvzDcNbWd7BA5QE';

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  // "Installed" (Home Screen, standalone window) vs. just open in a
  // regular browser tab -- iOS Safari only allows Push subscriptions
  // from the former.
  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  }

  // iOS specifically requires installing to the Home Screen first --
  // Settings uses this to swap the toggle for an explanatory message
  // instead, rather than letting the user hit a confusing permission
  // failure.
  function needsIOSInstall() {
    return isIOS() && !isStandalone();
  }

  function isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !needsIOSInstall();
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  function getExistingSubscription() {
    return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); });
  }

  // Resolves the row's `enabled` flag, or false if no row exists yet
  // (never subscribed) -- used to set the Settings toggle's initial state.
  function getEnabledStatus(userId) {
    return App.Supabase.from('push_subscriptions').select('enabled').eq('user_id', userId).maybeSingle().then(function (res) {
      if (res.error) { console.error('[Push] getEnabledStatus failed:', res.error); return false; }
      return !!(res.data && res.data.enabled);
    });
  }

  function subscribe(userId) {
    if (Notification.permission === 'denied') {
      return Promise.resolve({ ok: false, error: 'Notifications are blocked for this site — enable them in your browser or phone’s notification settings, then try again.' });
    }
    return Notification.requestPermission().then(function (permission) {
      if (permission !== 'granted') return { ok: false, error: 'Permission was not granted.' };
      return navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }).then(function (sub) {
        const json = sub.toJSON();
        return App.Supabase.from('push_subscriptions').upsert({
          user_id: userId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth_key: json.keys.auth,
          enabled: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' }).then(function (res) {
          if (res.error) return { ok: false, error: res.error.message };
          return { ok: true };
        });
      });
    }).catch(function (err) {
      return { ok: false, error: (err && err.message) || 'Could not enable notifications.' };
    });
  }

  // Unsubscribes the browser's own push endpoint AND flips the DB row's
  // enabled flag (rather than deleting it) -- re-enabling later just
  // upserts fresh endpoint/keys back over the same row.
  function unsubscribe(userId) {
    return getExistingSubscription().then(function (sub) {
      return sub ? sub.unsubscribe() : Promise.resolve();
    }).then(function () {
      return App.Supabase.from('push_subscriptions').update({ enabled: false, updated_at: new Date().toISOString() }).eq('user_id', userId);
    }).then(function (res) {
      if (res.error) return { ok: false, error: res.error.message };
      return { ok: true };
    }).catch(function (err) {
      return { ok: false, error: (err && err.message) || 'Could not disable notifications.' };
    });
  }

  return { isSupported, needsIOSInstall, getEnabledStatus, subscribe, unsubscribe };
})();
