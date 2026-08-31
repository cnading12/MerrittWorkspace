// GET /api/admin/applications — the admin queue, as two separate reads.
//
// Returns `{ trial, standard, diagnostics }`. The two lists are built by two
// different queries on purpose; lib/portal/applicationQueue.ts explains why
// a trial day must not be selected on `status = 'pending'` the way a
// membership application is.
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
  type QueueRow,
} from '@/lib/portal/applicationQueue';

export const dynamic = 'force-dynamic';

// How many rows either read will pull back. The trial read is not filtered
// on status, so it is bounded by count rather than by a status that may not
// mean what we think it means.
const MAX_ROWS = 500;

type Row = QueueRow & Record<string, unknown>;

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

    let standardQuery = sb
      .from('member_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(MAX_ROWS);
    if (status && status !== 'all') {
      standardQuery = standardQuery.eq('status', status);
    } else if (!status) {
      standardQuery = standardQuery.eq('status', 'pending');
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
        readVia: trialRead.via,
        includeHandled,
        warnings: trialRead.warnings,
      },
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
