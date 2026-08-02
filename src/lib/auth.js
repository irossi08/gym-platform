window.App = window.App || {};

/**
 * Supabase Auth (email + password). Session state is cached in memory here
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

  function mapUser(sbUser) {
    if (!sbUser) return null;
    const meta = sbUser.user_metadata || {};
    return {
      id: sbUser.id,
      email: sbUser.email,
      username: meta.username || (sbUser.email || '').split('@')[0],
    };
  }

  supabase.auth.onAuthStateChange(function (_event, session) {
    currentUser = mapUser(session ? session.user : null);
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

  function logout() {
    currentUser = null;
    supabase.auth.signOut();
  }

  function getCurrentUser() {
    return currentUser;
  }

  return { signup, login, logout, getCurrentUser, ready };
})();
