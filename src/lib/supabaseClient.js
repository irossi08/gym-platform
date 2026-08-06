window.App = window.App || {};

/**
 * Single shared Supabase client -- Auth and every App.Storage table
 * read/write go through this. The project URL given to us was the REST
 * endpoint (.../rest/v1/); createClient wants just the bare project URL
 * and appends /rest/v1/, /auth/v1/, etc. itself.
 *
 * flowType is explicit ('pkce') rather than left to the library default:
 * this app's own router treats window.location.HASH as the route
 * (#/home, #/login, ...), and the implicit OAuth flow returns its tokens
 * in that same hash fragment (#access_token=...) -- a collision that, at
 * best, relies on exact init-order timing to avoid the router briefly
 * treating a token blob as a route name. PKCE instead returns a `code` in
 * the query string (?code=...), which the router never looks at, so
 * there's no ambiguity regardless of timing.
 *
 * detectSessionInUrl is explicitly OFF: that flag hands the ?code=...
 * exchange to an internal step of this library we have no visibility
 * into or control over. auth.js's exchangeOAuthCodeIfPresent() is the
 * ONLY code path allowed to call exchangeCodeForSession -- it logs every
 * call and hard-guards against processing the same code twice
 * (Google/Supabase authorization codes are single-use; exchanging one
 * twice is exactly what produces "Unable to exchange external code").
 * Turning this library behavior off is what makes that guarantee
 * possible -- with it on, both this code AND the library could
 * independently attempt the same exchange with no way to tell from here.
 */
App.Supabase = window.supabase.createClient(
  'https://sfteeyeoevichkdgtnby.supabase.co',
  'sb_publishable_KaoTqoZEe3uWMnfNvw4tFg_Hu4KxryJ',
  { auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true } }
);
