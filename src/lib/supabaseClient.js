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
 */
App.Supabase = window.supabase.createClient(
  'https://sfteeyeoevichkdgtnby.supabase.co',
  'sb_publishable_KaoTqoZEe3uWMnfNvw4tFg_Hu4KxryJ',
  { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true } }
);
