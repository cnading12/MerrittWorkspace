// POST /api/admin/applications/self-test — prove the application pipeline
// end to end, from inside the deployed environment, with one click.
//
// "I submitted a test and nothing is showing" has at least five different
// causes that all look identical from the admin panel: the form never
// reached the API, the insert failed, the insert landed in a different
// Supabase project than the one being inspected, the row landed but the
// queue read cannot see it, or the row landed and was later deleted. None
// of them can be told apart without either the staff inbox or database
// access — and this environment's database is only reachable from the
// deployed code itself. So the deployed code tests itself:
//
//   1. report which Supabase project this deployment is actually connected
//      to (the hostname of NEXT_PUBLIC_SUPABASE_URL — the same project ref
//      the Supabase dashboard shows in its URL, so an admin can compare);
//   2. report the newest member_applications row it can see;
//   3. INSERT a clearly-marked synthetic row down the same migration ladder
//      the real trial route walks;
//   4. read it back by id, reporting the status the database assigned it —
//      a drifted status default (anything but 'pending') is one confirmed
//      way fresh rows go straight to "hidden — already approved";
//   5. confirm the same recent-window read the queue uses can see it;
//   6. DELETE it and verify it is gone.
//
// On the deletion: "a submitted application is never unwound" (CLAUDE.md)
// protects real applicants — people who told us they are coming to the
// building. This row is synthetic, created by this route seconds earlier,
// marked as such, and deleting it is the whole point. If the delete fails,
// the row is flagged with the dismissal marker instead so it cannot sit in
// the trial queue as a phantom visit; its name says what it is either way.

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { isMissingColumnError } from '@/lib/portal/applicationQueue';

export const dynamic = 'force-dynamic';

interface Step {
  step: string;
  ok: boolean;
  detail: string;
}

function supabaseHost(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname || '(unset)';
  } catch {
    return '(unset or malformed)';
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const sb = getServiceSupabase();
    const steps: Step[] = [];
    const marker = `self-test-${Date.now()}`;

    // 1. Which database is this deployment talking to?
    steps.push({
      step: 'Environment',
      ok: true,
      detail: `This deployment reads and writes the Supabase project at ${supabaseHost()}. If that is not the project open in your Supabase dashboard, you are looking at two different databases.`,
    });

    // 2. Newest row this database holds, before we add anything.
    const { data: newest, error: newestErr } = await sb
      .from('member_applications')
      .select('id, created_at, status')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    steps.push(
      newestErr
        ? { step: 'Read newest row', ok: false, detail: `The read failed: ${newestErr.message}` }
        : newest
          ? {
              step: 'Read newest row',
              ok: true,
              detail: `Newest application row was created ${newest.created_at} (status ${JSON.stringify(newest.status)}). Any submission made after that moment did not reach this database.`,
            }
          : { step: 'Read newest row', ok: true, detail: 'The member_applications table is empty.' }
    );

    // 3. Insert a synthetic row down the same ladder the trial route walks,
    //    dropping the columns a database behind on a migration does not have.
    const baseRow = {
      email: 'selftest@merrittworkspace.net',
      first_name: 'PIPELINE',
      last_name: 'SELF-TEST',
      phone: '000-000-0000',
      company_name: 'Admin panel self-test — safe to ignore',
      membership_type: 'dedicated_desk',
      start_date: null,
      payload: {
        self_test: true,
        marker,
        application_kind: 'trial',
        wants_trial_day: true,
      },
    };
    const attempts: Array<Record<string, unknown>> = [
      { ...baseRow, application_kind: 'trial', wants_trial_day: true },
      { ...baseRow, wants_trial_day: true },
      { ...baseRow },
    ];
    let testId: string | null = null;
    let insertDetail = '';
    for (const attempt of attempts) {
      const { data, error } = await sb
        .from('member_applications')
        .insert(attempt)
        .select('id')
        .single();
      if (!error && data?.id) {
        testId = data.id;
        insertDetail = `Inserted test row ${data.id} the same way a real submission is written.`;
        break;
      }
      insertDetail = `Insert failed: ${error?.message || 'no row came back'}`;
      if (!isMissingColumnError(error)) break;
    }
    steps.push({ step: 'Write a row', ok: !!testId, detail: insertDetail });

    if (!testId) {
      return NextResponse.json({
        ok: false,
        verdict:
          'THE WRITE PATH IS BROKEN: this deployment cannot insert into member_applications. Every real submission is failing the same way — the exact database error is above.',
        steps,
      });
    }

    // 4. Read it back by id — and report the status the database gave it.
    const { data: readBack, error: readErr } = await sb
      .from('member_applications')
      .select('id, status, created_at, payload')
      .eq('id', testId)
      .maybeSingle();
    if (readErr || !readBack) {
      steps.push({
        step: 'Read it back',
        ok: false,
        detail: `The row was inserted but reading it back by id failed: ${readErr?.message || 'no row found'}.`,
      });
    } else {
      const status = readBack.status;
      const drifted = status !== 'pending' && status !== null;
      steps.push({
        step: 'Read it back',
        ok: !drifted,
        detail: drifted
          ? `The database assigned the fresh row status ${JSON.stringify(status)} instead of 'pending'. The table's status default has drifted — every new application starts life as "already handled" and is hidden from the queue on arrival. Fix the column default in the Supabase SQL editor.`
          : `The row is readable and the database assigned it status ${JSON.stringify(status)}, as expected.`,
      });
    }

    // 5. Can the queue's own recent-window read see it?
    const { data: windowRows, error: windowErr } = await sb
      .from('member_applications')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(10);
    const inWindow = !windowErr && (windowRows || []).some((r) => r.id === testId);
    steps.push({
      step: 'Queue read sees it',
      ok: inWindow,
      detail: windowErr
        ? `The queue-style read failed: ${windowErr.message}`
        : inWindow
          ? 'The same newest-first read the admin queue uses returned the test row.'
          : 'The queue-style read did NOT return the test row even though it exists — the read path is losing rows.',
    });

    // 6. Clean up, and verify the cleanup. This synthetic row is ours to
    //    delete; the never-unwind rule protects real applicants, not this.
    const { error: delErr } = await sb.from('member_applications').delete().eq('id', testId);
    const { data: ghost } = await sb
      .from('member_applications')
      .select('id')
      .eq('id', testId)
      .maybeSingle();
    if (!delErr && !ghost) {
      steps.push({ step: 'Delete the test row', ok: true, detail: 'Test row deleted and confirmed gone.' });
    } else {
      // Could not delete it — hide it from the queue instead so it cannot
      // sit in the trial tab as a phantom visit.
      await sb
        .from('member_applications')
        .update({ payload: { ...(baseRow.payload as object), dismissed_at: new Date().toISOString() } })
        .eq('id', testId);
      steps.push({
        step: 'Delete the test row',
        ok: false,
        detail: `Could not delete the test row (${delErr?.message || 'it is still readable after the delete'}); it has been marked dismissed instead. It is named PIPELINE SELF-TEST and is safe to remove by hand.`,
      });
    }

    const allOk = steps.every((s) => s.ok);
    return NextResponse.json({
      ok: allOk,
      verdict: allOk
        ? 'THE PIPELINE WORKS: this deployment can write an application, read it back as the queue does, and the database assigns fresh rows the right status. If a form submission still does not appear here, it never reached this deployment — check the staff inbox: every real submission emails staff, with a 🚨 NOT SAVED subject when the save failed, and no email at all means the form never posted.'
        : 'At least one step failed — the failing step above names the exact break.',
      steps,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
