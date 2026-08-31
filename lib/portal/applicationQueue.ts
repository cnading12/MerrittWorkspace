// The admin application queue, split in two.
//
// Two queues, because they are two jobs. A membership application is a
// decision — approve or decline, and "pending" is exactly what awaits one. A
// trial day is a visit: someone has told us they are coming to the building
// on a named day, nothing about it is gated on a decision, and the only
// thing staff have to do is expect them.
//
// They used to be one list, with the visits rendered as a band pinned to the
// top of the approve/decline queue. That coupled them: anything that emptied
// or hid the pending list hid the visits with it, and a visit that nobody
// sees is a person arriving at a door nobody is expecting.
//
// The important asymmetry is in how each queue is READ:
//
//   • Membership applications are selected on `status = 'pending'`. That is
//     what "awaiting a decision" means, and a decided application should
//     leave the queue.
//
//   • Trial days are NOT selected on status. They are selected on being a
//     trial row at all, and the handled ones are dropped afterwards by
//     naming the two statuses that mean handled. So a trial row whose status
//     column says something unexpected — null, a value from a row inserted
//     by hand, a database whose column default never got applied — still
//     appears. Being unable to explain a status is not a reason to hide
//     someone who is coming to the building on Thursday; the cost of a stale
//     card is one click to dismiss, and the cost of a hidden visit is an
//     applicant standing in reception.
//
// Everything here is pure so both the route and its tests can use it.

import { readTrialFlag } from './trial';
import { isTrialApplication } from './trialApplication';

export interface QueueRow {
  id: string;
  status?: string | null;
  start_date?: string | null;
  created_at?: string | null;
  wants_trial_day?: boolean | null;
  trial_date?: string | null;
  application_kind?: string | null;
  payload?: Record<string, unknown> | null;
}

// The two statuses that mean a human has dealt with this row. Anything else
// — including nothing at all — counts as still open, deliberately: see the
// asymmetry note above.
const HANDLED_STATUSES = new Set(['approved', 'declined']);

// Has a human dealt with this row?
//
// Two independent signals, and either is enough, for the same reason the
// trial read does not trust `status` to select on: `payload.dismissed_at` is
// written by the Dismiss button as a second, separate write precisely so a
// dismissal does not depend on the `status` column behaving. Whichever of
// the two lands, the row is dismissed and leaves the queue.
export function isHandled(row: QueueRow): boolean {
  if (HANDLED_STATUSES.has(String(row.status || '').toLowerCase())) return true;
  return isDismissedInPayload(row);
}

/** Dismissed via `payload.dismissed_at`, independently of `status`. */
export function isDismissedInPayload(row: QueueRow): boolean {
  const at = (row.payload as { dismissed_at?: unknown } | null)?.dismissed_at;
  return typeof at === 'string' && at.length > 0;
}

// Does this row belong in the trial queue?
//
// Two signals, and either is enough. `application_kind = 'trial'` is a row
// from the short trial form. `wants_trial_day` is the older combined form,
// where a full membership application could also ask for a trial day — those
// are real visits too, and they keep their Approve button because they carry
// a whole application behind them.
//
// Both helpers already fall back to `payload`, so this is also correct on a
// database that is behind on a migration.
export function isTrialQueueRow(row: QueueRow): boolean {
  return isTrialApplication(row) || readTrialFlag(row);
}

export function byTrialDateAsc(a: QueueRow, b: QueueRow): number {
  const aDate = readTrialDateForSort(a);
  const bDate = readTrialDateForSort(b);
  return aDate.localeCompare(bDate);
}

function readTrialDateForSort(row: QueueRow): string {
  if (row.trial_date) return row.trial_date;
  const fromPayload = (row.payload as { trial_date?: unknown } | null)?.trial_date;
  return typeof fromPayload === 'string' && fromPayload ? fromPayload : '9999-12-31';
}

export function byStartDateAsc(a: QueueRow, b: QueueRow): number {
  return (a.start_date || '9999-12-31').localeCompare(b.start_date || '9999-12-31');
}

/**
 * Split rows into the two queues.
 *
 * `rows` may contain duplicates (the trial and standard reads are separate
 * queries and a legacy row matches both); they are deduplicated by id.
 *
 * `includeHandled` only widens the TRIAL queue. The standard queue is
 * already selected on `status = 'pending'` by the caller, and a decided
 * membership application has somewhere else to be.
 */
export function splitApplicationQueue<T extends QueueRow>(
  rows: T[],
  opts: { includeHandled?: boolean } = {}
): { trial: T[]; standard: T[] } {
  const seen = new Set<string>();
  const trial: T[] = [];
  const standard: T[] = [];
  for (const row of rows) {
    if (!row || !row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    if (isTrialQueueRow(row)) {
      if (opts.includeHandled || !isHandled(row)) trial.push(row);
    } else if (!isHandled(row)) {
      standard.push(row);
    }
  }
  trial.sort(byTrialDateAsc);
  standard.sort(byStartDateAsc);
  return { trial, standard };
}

// Is this PostgREST/Postgres error "this database does not have that column
// yet"? Two shapes to cover: PostgREST refusing an unknown key against its
// schema cache (PGRST204), and Postgres itself reporting an undefined column
// (42703).
//
// Shared by the trial write path (which walks a ladder of inserts, dropping
// the columns a database that is behind on a migration does not have) and
// the admin read path (which walks the same ladder of filters, for the same
// reason).
export function isMissingColumnError(
  error: { message?: string; code?: string } | null
): boolean {
  if (!error) return false;
  if (error.code === 'PGRST204' || error.code === '42703') return true;
  return /column .* does not exist|could not find the .* column|schema cache/i.test(
    error.message || ''
  );
}
