import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { verifyCancelToken } from '@/lib/portal/cancelToken';
import { memberHasEverPaid, removeUnpaidMember } from '@/lib/portal/memberRemoval';

export const dynamic = 'force-dynamic';

// Public, token-authorized "cancel my signup" endpoint backing the link in the
// onboarding reminder email. A not-yet-paid member clicks the link, lands on
// the confirmation page (app/portal/cancel-onboarding), and that page POSTs
// here. We deliberately keep the destructive action on POST (never GET) so an
// email client or security scanner prefetching the link can't remove anyone.
//
// On success the member is removed from the system and staff are notified
// (see removeUnpaidMember). The route is idempotent: a second click after the
// member is already gone still reports success.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const memberId = typeof body.member === 'string' ? body.member : '';
    const token = typeof body.token === 'string' ? body.token : '';

    if (!verifyCancelToken(memberId, token)) {
      return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 403 });
    }

    const sb = getServiceSupabase();
    const { data: member } = await sb
      .from('members')
      .select(
        'id, user_id, first_name, last_name, email, company_name, designation, desk_number, office_number, application_id, stripe_subscription_id'
      )
      .eq('id', memberId)
      .maybeSingle();

    // Already removed (or never existed) — treat as success so a repeat click
    // from the email is a clean no-op.
    if (!member) {
      return NextResponse.json({ ok: true, removed: true });
    }

    // Guard: if they've since paid and become a real member, don't delete them
    // out from under an active membership. Point them at the portal instead.
    if (await memberHasEverPaid(sb, member.id)) {
      return NextResponse.json(
        {
          error:
            'Your membership is already active. To make changes, please sign in to your member portal or contact member services.',
          alreadyActive: true,
        },
        { status: 409 }
      );
    }

    await removeUnpaidMember({ sb, member, cancelledBy: 'member' });
    return NextResponse.json({ ok: true, removed: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
