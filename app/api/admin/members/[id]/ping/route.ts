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
    if (member.application_id) {
      const { data: app } = await sb
        .from('member_applications')
        .select('start_date')
        .eq('id', member.application_id)
        .single();
      if (app?.start_date) {
        const d = new Date(app.start_date);
        if (!isNaN(d.getTime())) {
          startDateLabel = d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        }
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

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
