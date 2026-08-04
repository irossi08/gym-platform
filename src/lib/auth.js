window.App = window.App || {};

/**
 * Supabase Auth -- email + password, plus Google OAuth (signInWithGoogle).
 * Both land the same way: the exact same onAuthStateChange listener below
 * picks up a Google sign-in the moment the redirect back completes, same
 * as it already does for email/password, so nothing downstream (router's
 * mandatory-profile-setup gate, App.Storage.preloadAll, etc.) needs to
 * know or care which provider was used. Session state is cached in memory here
 * (kept current via onAuthStateChange) so App.Auth.getCurrentUser() stays
 * fully synchronous -- router.js and every page call it that way many
 * times per navigation, exactly like the old localStorage-based version.
 *
 * `ready()` resolves once the initial session (if any -- restored from the
 * token Supabase's own client already persists in localStorage) has been
 * loaded, so app.js can await it once before the router renders anything;
 * without that, the very first paint after a page refresh could flash a
 * "logged out" redirect before the real session is known.
 */
App.Auth = (function () {
  const supabase = App.Supabase;
  let currentUser = null;

  // If the OAuth redirect back came from an error (most likely: the
  // production URL isn't in Supabase's Authentication -> URL Configuration
  // -> Redirect URLs allow-list yet, or the provider itself is
  // misconfigured), Supabase still redirects to our own redirectTo, just
  // with ?error=...&error_description=... appended instead of a session --
  // which otherwise looks EXACTLY like "silently back at the login page"
  // with nothing in the console to explain why. Captured once at module
  // load (before anything strips the query string) so Auth.js can surface
  // it to the user instead of it being silently dropped.
  let oauthError = null;
  (function captureOAuthErrorFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error_description') || params.get('error');
    if (err) {
      oauthError = err.replace(/\+/g, ' ');
      console.error('[Auth] OAuth redirect returned an error:', oauthError);
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      url.searchParams.delete('error_description');
      url.searchParams.delete('error_code');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  })();

  function consumeOAuthError() {
    const err = oauthError;
    oauthError = null;
    return err;
  }

  // Non-consuming peek so router.js can decide where to route without
  // stealing the message Auth.js still needs to actually display it.
  function hasOAuthError() {
    return !!oauthError;
  }

  function mapUser(sbUser) {
    if (!sbUser) return null;
    const meta = sbUser.user_metadata || {};
    return {
      id: sbUser.id,
      email: sbUser.email,
      username: meta.username || (sbUser.email || '').split('@')[0],
    };
  }

  // Beyond just caching currentUser, this is also the safety net for the
  // OAuth redirect-back case: if the session lands here AFTER app.js's own
  // boot sequence already rendered the login/landing page with no user
  // (ready()'s getSession() resolved a beat too early), nothing else would
  // ever re-check it -- the user would be stuck looking logged-out despite
  // now actually having a session. So on any transition into a signed-in
  // state, warm App.Storage's cache the same way the manual login/signup
  // form already does, then ask the router to re-evaluate the current
  // route (which will redirect off login/landing once it sees a user).
  // Harmless if this races with that manual flow's own preloadAll call for
  // the ordinary email/password path -- preloadAll is just a batch of
  // reads into an in-memory cache, not a subscription, so calling it twice
  // just means one redundant round-trip, not corrupted state.
  supabase.auth.onAuthStateChange(function (_event, session) {
    const nextUser = mapUser(session ? session.user : null);
    const justSignedIn = !!nextUser && !currentUser;
    currentUser = nextUser;

    if (justSignedIn) {
      App.Storage.preloadAll(nextUser.id).then(function () {
        if (App.Components.FriendRequestToast) App.Components.FriendRequestToast.init(nextUser);
        if (App.Components.GymAutoComplete) App.Components.GymAutoComplete.init(nextUser);
        if (App.Router && App.Router.notifyAuthChanged) App.Router.notifyAuthChanged();
      });
    } else if (App.Router && App.Router.notifyAuthChanged) {
      App.Router.notifyAuthChanged();
    }
  });

  async function ready() {
    const { data } = await supabase.auth.getSession();
    currentUser = mapUser(data.session ? data.session.user : null);
  }

  async function signup(email, password) {
    const mail = (email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return { ok: false, error: 'Enter a valid email address.' };
    if ((password || '').length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };

    const { data, error } = await supabase.auth.signUp({
      email: mail,
      password: password,
      options: { data: { username: mail.split('@')[0] } },
    });
    if (error) return { ok: false, error: error.message };

    if (!data.session) {
      // This project requires email confirmation before a session is
      // issued -- there's no one to log in as yet.
      return { ok: true, needsConfirmation: true };
    }
    currentUser = mapUser(data.user);
    return { ok: true, user: currentUser };
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: (email || '').trim(),
      password: password,
    });
    if (error) return { ok: false, error: 'Incorrect email or password.' };
    currentUser = mapUser(data.user);
    return { ok: true, user: currentUser };
  }

  // Redirects the whole page to Google -- there's no session to return
  // here, unlike signup/login above. The redirect back lands on the
  // site root (no hash), so it flows through the exact same boot
  // sequence (app.js) and router gate (mandatory profile setup if
  // setup_complete isn't set yet) as any other login, provider-agnostic.
  // Only fails BEFORE the redirect happens (misconfigured provider,
  // network error) -- anything wrong on Google's side or after redirect
  // surfaces as an auth state change (or lack of one), not this return
  // value.
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  function logout() {
    currentUser = null;
    supabase.auth.signOut();
  }

  function getCurrentUser() {
    return currentUser;
  }

  return { signup, login, signInWithGoogle, logout, getCurrentUser, ready, consumeOAuthError, hasOAuthError };
})();
