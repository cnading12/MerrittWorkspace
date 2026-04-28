import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { sendOnboardingMagicLink } from '@/lib/portal/magicLink';

export const dynamic = 'force-dynamic';

// Generate a fresh one-time sign-in link for an existing member and
// re-send the welcome email. Used when a member's original magic link
// has expired (Supabase's default OTP validity is ~24 hours).
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
      .select('email, first_name')
      .eq('id', id)
      .single();
    if (error || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const sent = await sendOnboardingMagicLink({
      email: member.email,
      firstName: member.first_name,
    });
    if (!sent) {
      return NextResponse.json(
        { error: 'Could not send invitation email. Check Resend/Supabase config.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
