// functions/config.js

/**
 * A Cloudflare Pages Function that runs on the server-side.
 * It reads environment variables set in the Cloudflare dashboard
 * and exposes the public-safe ones to the frontend client.
 */
export async function onRequest(context) {
  // `env` is where the environment variables live
  const { env } = context;

  const config = {
    supabaseUrl: env.REACT_APP_SUPABASE_URL,
    supabaseAnonKey: env.REACT_APP_SUPABASE_ANON_KEY,
  };

  // Basic validation to ensure the administrator has set the variables
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return new Response(JSON.stringify({
      error: 'Backend configuration is missing. Please ensure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set in the Cloudflare Pages environment variables.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(config), {
    headers: { 'Content-Type': 'application/json' },
  });
}