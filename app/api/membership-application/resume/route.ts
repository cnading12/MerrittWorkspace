// GET /api/membership-application/resume?token=<resume_token>
//
// Prefill for the full membership application, keyed on the token in the
// "finish your application" link we email after a trial day. Answers the
// half of the problem that made splitting the forms awkward in the first
// place: a trial applicant who later becomes a member must not be asked for
// their name, phone, or photo ID a second time.
//
// The token is a bearer credential — anyone holding the link gets the
// details back — so this returns only what the person themselves typed on
// the trial form, and never the storage path of their ID (just the fact
// that one is on file). Staff notes, decisions, and internal ids stay out.

import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { isTrialApplication, trialPrefillFrom } from '@/lib/portal/trialApplication';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    return NextResponse.json({ error: 'Missing token.' }, { status: 400 });
  }

  try {
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from('member_applications')
      .select(
        'id, first_name, last_name, email, phone, company_name, trial_date, id_document_path, payload, application_kind, converted_to_application_id'
      )
      .eq('resume_token', token)
      .maybeSingle();

    if (error) {
      // A database without 20260824_trial_application_split.sql has no
      // resume_token column, so no link we ever sent can resolve. Treat it
      // as an unknown token: the form just renders empty rather than broken.
      console.error('Resume prefill lookup failed:', error);
      return NextResponse.json({ error: 'This link is no longer valid.' }, { status: 404 });
    }

    if (!data || !isTrialApplication(data)) {
      return NextResponse.json({ error: 'This link is no longer valid.' }, { status: 404 });
    }

    if (data.converted_to_application_id) {
      // They already submitted a full application off this link. Say so
      // rather than handing back a prefill that would produce a duplicate.
      return NextResponse.json(
        { error: 'You have already completed your membership application.', already_converted: true },
        { status: 409 }
      );
    }

    return NextResponse.json({ prefill: trialPrefillFrom(data) });
  } catch (e) {
    console.error('💥 Resume prefill error:', e);
    return NextResponse.json({ error: 'This link is no longer valid.' }, { status: 404 });
  }
}
