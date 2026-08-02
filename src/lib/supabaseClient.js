window.App = window.App || {};

/**
 * Single shared Supabase client -- Auth and every App.Storage table
 * read/write go through this. The project URL given to us was the REST
 * endpoint (.../rest/v1/); createClient wants just the bare project URL
 * and appends /rest/v1/, /auth/v1/, etc. itself.
 */
App.Supabase = window.supabase.createClient(
  'https://sfteeyeoevichkdgtnby.supabase.co',
  'sb_publishable_KaoTqoZEe3uWMnfNvw4tFg_Hu4KxryJ'
);
