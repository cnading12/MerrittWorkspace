import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { sendPortalCompletionReminder } from '@/lib/portal/magicLink';

export const dynamic = 'force-dynamic';

// Send a friendly reminder to a member who hasn't finished setting up their
// portal yet. Generates a fresh sign-in link (in case theirs expired) and
// includes a checklist of remaining onboarding steps in the email.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireAdmin(req);

    const sb = getServiceSupabase();
    const { data: member, error } = await sb
      .from('members')
      .select(
        'id, email, first_name, application_id, required_docs_complete, agreement_signed, stripe_subscription_id, onboarding_unlocked'
      )
      .eq('id', id)
      .single();
    if (error || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (member.onboarding_unlocked) {
      return NextResponse.json(
        { error: 'Member has already finished onboarding.' },
        { status: 400 }
      );
    }

    const missingSteps: string[] = [];
    if (!member.required_docs_complete)
      missingSteps.push('Upload your photo ID and proof of address');
    if (!member.agreement_signed)
      missingSteps.push('Sign your Member Agreement and Terms & Conditions');
    if (!member.stripe_subscription_id) missingSteps.push('Set up auto-pay');

    let startDateLabel: string | null = null;
    // Prefer the fee agreement start_date (legal source of truth) and fall
    // back to the original application's preferred start_date.
    let startDateRaw: string | null = null;
    const { data: feeAgreement } = await sb
      .from('member_agreements')
      .select('metadata')
      .eq('member_id', member.id)
      .eq('agreement_type', 'fee_agreement')
      .maybeSingle();
    const feeStart = (feeAgreement?.metadata as any)?.start_date;
    if (typeof feeStart === 'string' && feeStart) {
      startDateRaw = feeStart;
    } else if (member.application_id) {
      const { data: app } = await sb
        .from('member_applications')
        .select('start_date')
        .eq('id', member.application_id)
        .single();
      if (app?.start_date) startDateRaw = app.start_date;
    }
    if (startDateRaw) {
      const d = new Date(startDateRaw);
      if (!isNaN(d.getTime())) {
        startDateLabel = d.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    }

    const sent = await sendPortalCompletionReminder({
      email: member.email,
      firstName: member.first_name,
      missingSteps,
      startDateLabel,
    });
    if (!sent) {
      return NextResponse.json(
        { error: 'Could not send reminder email. Check Resend/Supabase config.' },
        { status: 500 }
      );
    }

    // Record the ping timestamp so other admins sharing this account can see
    // when this member was last pinged and avoid sending duplicate reminders.
    const pingedAt = new Date().toISOString();
    await sb
      .from('members')
      .update({ last_pinged_at: pingedAt })
      .eq('id', member.id);

    return NextResponse.json({ ok: true, last_pinged_at: pingedAt });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
