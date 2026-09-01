// A fresh Supabase access token for an admin API call.
//
// Every admin page used to capture `session.access_token` ONCE, at mount,
// and reuse that string for every request the tab ever made. Supabase access
// tokens expire after about an hour; supabase-js quietly refreshes the
// session in the background, but nothing ever updated the captured string.
// So any admin tab older than an hour was sending a dead token with every
// click: Approve and Dismiss answered 401, and the focus-refetch bounced the
// page to the sign-in screen — all of which reads as "the admin panel does
// nothing" while the database, and the deployed code, are fine. Admin tabs
// live for days; an hour is nothing.
//
// getSession() returns the CURRENT session, refreshing it first when it has
// expired, so a token fetched per request cannot outlive its tab. Callers
// keep their mounted token as a fallback so a transient failure here
// degrades to the old behavior instead of a dead button.
import { supabase } from '@/lib/supabase';

export async function freshAccessToken(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}
