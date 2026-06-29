// Helpers for the soft-archive feature that let admin read paths keep working
// even before the `archived_at` migration (20260625_member_archive.sql) has
// been applied to the database.
//
// Without this guard, any admin query that filters on `members.archived_at`
// (the member list, the dashboard counts) hard-errors with Postgres 42703
// ("column does not exist") on a database that hasn't run the migration yet —
// which empties the entire admin panel. These helpers detect that specific
// error so callers can transparently fall back to the pre-archive behavior.

export function isMissingArchivedColumnError(error: unknown): boolean {
  if (!error) return false;
  const e = error as { code?: string; message?: string };
  if (e.code === '42703') return true; // undefined_column
  return typeof e.message === 'string' && e.message.includes('archived_at');
}
