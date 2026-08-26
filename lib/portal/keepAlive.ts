// Supabase keep-alive — the liveness query behind
// `app/api/cron/supabase-keep-alive` (scheduled daily in vercel.json).
//
// WHY THIS EXISTS: Supabase pauses Free-plan projects after ~7 consecutive
// days with no database activity, and restoring a paused project is a manual
// click in the Supabase dashboard that this app cannot trigger. The site can
// easily go a week without traffic that reaches the database (marketing pages
// are static; bookings and the portal are bursty), so without a scheduled
// query the next real member request would land on a paused project and fail.
//
// The keep-alive is ONE cheap read: a `head: true` exact count, which is a
// genuine query — it resets Supabase's inactivity timer — but transfers no
// rows. Do NOT "improve" this by inserting and deleting a throwaway record in
// a real table: Supabase only cares that the database was queried, so the read
// buys identical protection, while a fake record would ripple through every
// downstream consumer of that table and leave an orphaned row behind if the
// delete step ever failed.

import type { SupabaseClient } from '@supabase/supabase-js';

export const KEEP_ALIVE_JOB = 'supabase-keep-alive';

// `members` is the portal's core table: it exists in every environment, is
// never going away, and is small enough that an exact count is trivial.
export const KEEP_ALIVE_TABLE = 'members';

// Best-effort audit trail (supabase/migrations/20260817_cron_runs.sql). These
// live in lib/portal/cronRuns.ts now that the monthly dues summary writes its
// receipt the same way; re-exported here so this module stays the one import
// the keep-alive route needs.
export { CRON_RUNS_TABLE, recordCronRun, utcDayKey } from './cronRuns';

export type KeepAlivePingResult = { table: string; count: number | null };

/**
 * Issue the keep-alive read. Throws if the query fails — this read, and only
 * this read, decides whether the database is up.
 */
export async function pingDatabase(
  sb: SupabaseClient<any, any, any>
): Promise<KeepAlivePingResult> {
  const { count, error } = await sb
    .from(KEEP_ALIVE_TABLE)
    .select('id', { count: 'exact', head: true });
  if (error) {
    throw new Error(
      `Supabase keep-alive query on "${KEEP_ALIVE_TABLE}" failed: ${error.message}`
    );
  }
  return { table: KEEP_ALIVE_TABLE, count: count ?? null };
}
