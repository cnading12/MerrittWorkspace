// Shared plumbing for the scheduled jobs in `app/api/cron/*`.
//
// Vercel's cron dashboard only keeps recent invocations, so weeks later
// there is no way to answer "did the job run on the 7th?" from Vercel
// alone. The `cron_runs` table (supabase/migrations/20260817_cron_runs.sql)
// is that receipt, written by each job for itself.
//
// Extracted from lib/portal/keepAlive.ts, which still re-exports these so
// the keep-alive route is untouched.

import type { SupabaseClient } from '@supabase/supabase-js';

export const CRON_RUNS_TABLE = 'cron_runs';

/**
 * Record that a scheduled job ran, so we can prove after the fact that it
 * fired — and what it decided.
 *
 * BEST EFFORT BY DESIGN: never throws and never changes the job's verdict.
 * The `cron_runs` table may not exist yet (migrations are applied by hand),
 * and no job should report failure because an audit insert failed. Returns
 * whether the row landed, purely so the response can say so.
 */
export async function recordCronRun(
  sb: SupabaseClient<any, any, any>,
  entry: { job: string; ok: boolean; detail?: string | null }
): Promise<boolean> {
  try {
    const { error } = await sb.from(CRON_RUNS_TABLE).insert({
      job: entry.job,
      ok: entry.ok,
      detail: entry.detail ?? null,
    });
    if (error) throw new Error(error.message);
    return true;
  } catch (e) {
    console.warn(`Audit row for cron job "${entry.job}" not recorded:`, e);
    return false;
  }
}

/**
 * UTC calendar day (YYYY-MM-DD) used to scope a failure alert's idempotency
 * key: a same-day retry dedupes, but a multi-day outage alerts once per day
 * instead of going quiet after the first message.
 */
export function utcDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
