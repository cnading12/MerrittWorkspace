// GET /api/admin/lookup?email=… — everything the database holds for one
// email, and exactly where each piece is (or is not) on the admin screens.
//
// The panel's diagnostics answer "what does the queue hold"; this answers
// the other question that keeps coming up in support: "what happened to
// THIS person". A test submission dismissed while its identical-looking
// twin stays on screen, a member invisible because an archive click
// half-landed, an application hidden as approved — from the UI these are
// indistinguishable, and each sends staff to the SQL editor. One email in,
// one plain report out: every application row with which tab shows it or
// why it is hidden, every member row with which view holds it.
//
// Read-only on purpose. It names the screen and button that act on each
// row rather than acting itself, so it can never make anything worse.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import {
  isHandled,
  isDismissedInPayload,
  isTrialQueueRow,
  explainHiddenRow,
} from '@/lib/portal/applicationQueue';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const email = (new URL(req.url).searchParams.get('email') || '').trim();
    if (!email) {
      return NextResponse.json({ error: 'Pass an email to trace.' }, { status: 400 });
    }
    const sb = getServiceSupabase();

    // ilike with no wildcards = case-insensitive equality, so the trace
    // matches however the form-typed address was cased.
    const [appsRes, membersRes] = await Promise.all([
      sb
        .from('member_applications')
        .select('*')
        .ilike('email', email)
        .order('created_at', { ascending: false }),
      sb.from('members').select('*').ilike('email', email),
    ]);
    if (appsRes.error) throw new Error(appsRes.error.message);
    if (membersRes.error) throw new Error(membersRes.error.message);

    const applications = (appsRes.data || []).map((row: any) => ({
      id: row.id,
      created_at: row.created_at ?? null,
      status: row.status ?? null,
      kind: isTrialQueueRow(row) ? 'trial' : 'membership',
      dismissed_marker: isDismissedInPayload(row),
      where: isHandled(row)
        ? explainHiddenRow(row)
        : isTrialQueueRow(row)
          ? 'SHOWING as a card on the Trial days tab right now'
          : 'SHOWING as a card on the Membership applications tab right now',
    }));

    const members = (membersRes.data || []).map((m: any) => ({
      id: m.id,
      created_at: m.created_at ?? null,
      status: m.status ?? null,
      designation: m.designation ?? null,
      archived: !!m.archived_at,
      where: m.archived_at
        ? 'HIDDEN from the Members page — click "View archived" there to see them, then Restore or (if never paid) delete'
        : 'on the Members page (set the status filter to "All statuses" and clear the search box)',
    }));

    return NextResponse.json({
      email,
      applications,
      members,
      summary:
        applications.length === 0 && members.length === 0
          ? 'This database holds nothing for that email — no application row and no member row. If a form was submitted with it, the submission never reached this database.'
          : `${applications.length} application row(s) and ${members.length} member row(s) exist for that email; each says where it is.`,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
