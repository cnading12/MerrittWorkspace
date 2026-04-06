// Server-only Supabase client using the service role key.
// NEVER import this from client components.
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient<any, any, any> | null = null;

export function getServiceSupabase(): SupabaseClient<any, any, any> {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars'
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
