// GET /api/admin/applications — the admin queue, as two separate reads.
//
// Returns `{ trial, standard, diagnostics }`. The two lists are built by two
// different queries on purpose; lib/portal/applicationQueue.ts explains why
// neither queue is selected on `status = 'pending'` — rows a human has
// explicitly handled are dropped afterwards, in JS, instead.
//
// `diagnostics` is not decoration. "A trial day was submitted and the admin
// panel shows nothing" is the failure this endpoint exists to make
// answerable, and the difference between "no trial rows exist", "trial rows
// exist but are all handled" and "the query itself failed" is invisible from
// an empty list. The admin page prints it under the queue.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import {
  isMissingColumnError,
  splitApplicationQueue,
  isTrialQueueRow,
  isHandled,
  isDismissedInPayload,
  explainHiddenRow,
  type QueueRow,
} from '@/lib/portal/applicationQueue';

export const dynamic = 'force-dynamic';

// How many rows either read will pull back. The trial read is not filtered
// on status, so it is bounded by count rather than by a status that may not
// mean what we think it means.
const MAX_ROWS = 500;

// How many rows the diagnostics block lists. Hidden rows fill it first —
// they are the ones "why is this not showing" is about.
const RECENT_ROW_LIMIT = 25;

type Row = QueueRow & Record<string, unknown>;

function readSupabaseHost(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname || '(unset)';
  } catch {
    return '(unset or malformed)';
  }
}

interface TrialRead {
  rows: Row[];
  // Which rung of the ladder answered, so a support question about a
  // half-migrated database has a fact to start from.
  via: string;
  warnings: string[];
}

// Every trial row, newest first, WITHOUT a status filter.
//
// Walks down the same migration ladder the write path does
// (app/api/membership-application/trial/route.ts): each rung drops the
// columns a database that is one migration behind does not have, and the
// bottom rung reads no trial column at all and classifies from `payload`,
// which every rung of the write path mirrors into.
async function selectTrialRows(sb: ReturnType<typeof getServiceSupabase>): Promise<TrialRead> {
  const warnings: string[] = [];
  const base = () =>
    sb
      .from('member_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS);

  // Rung 1: both trial columns present. `or` so the short trial form
  // (application_kind = 'trial') and the older combined form
  // (wants_trial_day = true) both come back.
  let res = await base().or('application_kind.eq.trial,wants_trial_day.eq.true');
  if (!res.error) {
    return { rows: (res.data || []) as Row[], via: 'application_kind or wants_trial_day', warnings };
  }
  if (!isMissingColumnError(res.error)) throw new Error(res.error.message);
  warnings.push(
    'member_applications is missing application_kind — apply 20260824_trial_application_split.sql.'
  );

  // Rung 2: no application_kind column yet.
  res = await base().eq('wants_trial_day', true);
  if (!res.error) {
    return { rows: (res.data || []) as Row[], via: 'wants_trial_day', warnings };
  }
  if (!isMissingColumnError(res.error)) throw new Error(res.error.message);
  warnings.push(
    'member_applications is missing wants_trial_day — apply 20260428_trial_day_applicants.sql.'
  );

  // Rung 3: no trial columns at all. Read the recent window and let
  // splitApplicationQueue classify from `payload`.
  res = await base();
  if (res.error) throw new Error(res.error.message);
  return { rows: (res.data || []) as Row[], via: 'payload scan', warnings };
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const sb = getServiceSupabase();
    const url = new URL(req.url);

    // `status` is kept for callers that ask for a specific one (and for any
    // older client bundle still requesting it). It applies to the standard
    // queue only — a trial day is never selected on status.
    const status = url.searchParams.get('status');
    const includeHandled =
      url.searchParams.get('include') === 'all' ||
      url.searchParams.get('include') === 'handled';

    // The standard read is deliberately NOT `eq('status', 'pending')` any
    // more. That filter assumed the column always holds one of its three
    // expected values — and a live table whose default or constraint has
    // drifted (migrations here are applied by hand) inserts rows this
    // endpoint could then never see, while the Documents page, which reads
    // without a status filter, showed them fine. An application whose status
    // cannot be explained costs a card in the queue; hiding on it costs the
    // application. So the recent window is read whole and the rows a human
    // has explicitly dealt with — approved, declined, or carrying the
    // dismissal marker — are dropped afterwards in JS, by
    // splitApplicationQueue, the same way the trial queue always has.
    let standardQuery = sb
      .from('member_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS);
    if (status && status !== 'all') {
      standardQuery = standardQuery.eq('status', status);
    }

    const [trialRead, standardRes] = await Promise.all([
      selectTrialRows(sb),
      standardQuery,
    ]);
    if (standardRes.error) throw new Error(standardRes.error.message);

    const standardRows = (standardRes.data || []) as Row[];
    // The bottom rung of the ladder reads the whole recent window, because a
    // database with no trial columns has nothing to filter on. Narrowing to
    // actual trial rows here makes every rung behave the same from this
    // point on, and keeps the counts below honest.
    const trialRows = trialRead.rows.filter(isTrialQueueRow);
    // Trial rows first so a row that satisfies both reads is deduplicated
    // into the trial queue, which is where staff act on it.
    const { trial, standard } = splitApplicationQueue<Row>(
      [...trialRows, ...standardRows],
      { includeHandled }
    );

    // What the database actually holds, from the rows this request already
    // read — no extra queries. "Nothing is showing" has at least four
    // different causes (no rows, rows all decided, rows with a status the
    // filter used to hide, rows misclassified between the tabs) and the
    // page prints these numbers so staff — and whoever they forward a
    // screenshot to — can tell which one this is.
    const seenIds = new Set<string>();
    const window: Row[] = [];
    for (const row of [...trialRows, ...standardRows]) {
      if (!row?.id || seenIds.has(row.id)) continue;
      seenIds.add(row.id);
      window.push(row);
    }
    const statusCounts: Record<string, number> = {};
    for (const row of window) {
      const key =
        row.status === null || row.status === undefined
          ? '(null)'
          : String(row.status) === ''
            ? '(empty)'
            : String(row.status);
      statusCounts[key] = (statusCounts[key] || 0) + 1;
    }
    const trialIds = new Set(trial.map((r) => r.id));
    const standardIds = new Set(standard.map((r) => r.id));
    const isShown = (row: Row) => trialIds.has(row.id) || standardIds.has(row.id);
    const byNewest = (a: Row, b: Row) =>
      String(b.created_at || '').localeCompare(String(a.created_at || ''));

    // Hidden rows are listed ahead of the merely-recent ones.
    //
    // The panel tells the reader that an application missing from this list
    // was never written to the database. A flat "newest 8" made that untrue
    // the moment a ninth row existed: the row being asked about is by
    // definition one the tabs are not showing, and it was the first thing a
    // recency cut dropped. Hidden rows come first for that reason, and the
    // total is reported so the panel can say when it has been truncated
    // rather than implying the list is exhaustive.
    const hiddenRows = window.filter((row) => !isShown(row)).sort(byNewest);
    const shownRows = window.filter(isShown).sort(byNewest);
    const recentRows = [...hiddenRows, ...shownRows]
      .slice(0, RECENT_ROW_LIMIT)
      .sort(byNewest)
      .map((row) => ({
        id: row.id,
        created_at: row.created_at ?? null,
        status: row.status ?? null,
        kind: isTrialQueueRow(row) ? 'trial' : 'membership',
        dismissed_marker: isDismissedInPayload(row),
        shown_in: trialIds.has(row.id)
          ? 'Trial days tab'
          : standardIds.has(row.id)
            ? 'Membership applications tab'
            : // One lumped string covered three different situations needing
              // three different actions — and missed the existing-member
              // form entirely, which is the confirmed way a row reaches the
              // Documents page and not this one.
              explainHiddenRow(row),
      }));
    const membershipRows = window.filter((row) => !isTrialQueueRow(row));

    return NextResponse.json({
      trial,
      standard,
      // Back-compat for any client bundle still reading a single list.
      applications: [...trial, ...standard],
      diagnostics: {
        trialRowsFound: trialRows.length,
        trialRowsHandled: trialRows.filter(isHandled).length,
        trialShown: trial.length,
        standardShown: standard.length,
        membershipRowsFound: membershipRows.length,
        membershipRowsHandled: membershipRows.filter(isHandled).length,
        windowSize: window.length,
        statusCounts,
        recentRows,
        // So the panel can say "showing 25 of 60" instead of implying that
        // anything absent from the list was never saved.
        hiddenRowsFound: hiddenRows.length,
        recentRowLimit: RECENT_ROW_LIMIT,
        readVia: trialRead.via,
        includeHandled,
        warnings: trialRead.warnings,
        // Which Supabase project this deployment reads, and the newest row
        // it can see. "My test from today is not in this list" has two very
        // different meanings — the row was never written, or it was written
        // to a different database than the one being inspected — and these
        // two facts are what tells them apart. The host is the project ref
        // from NEXT_PUBLIC_SUPABASE_URL, already public in the client bundle.
        supabaseHost: readSupabaseHost(),
        newestRowCreatedAt:
          window.reduce<string | null>((newest, row) => {
            const at = typeof row.created_at === 'string' ? row.created_at : null;
            if (!at) return newest;
            return !newest || at > newest ? at : newest;
          }, null),
      },
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
