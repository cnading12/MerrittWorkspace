import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const member = await requireMember(req);
    if (!member.onboarding_unlocked) {
      return NextResponse.json({ error: 'Onboarding not yet unlocked' }, { status: 400 });
    }

    const sb = getServiceSupabase();

    // Avoid duplicates: if there's already a pending request, just return it.
    const { data: existing } = await sb
      .from('access_code_requests')
      .select('id')
      .eq('member_id', member.id)
      .eq('status', 'pending')
      .maybeSingle();

    if (!existing) {
      await sb.from('access_code_requests').insert({ member_id: member.id });
    }

    // Notify admin via email.
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Merritt Workspace Portal <portal@merrittworkspace.net>',
        to: 'manager@merrittworkspace.net',
        subject: `Access code requested — ${member.first_name} ${member.last_name}`,
        html: `
          <p><strong>${member.first_name} ${member.last_name}</strong> (${member.email}) has requested a 24/7 building access code.</p>
          <p>Get a code from POPS, then assign it in the admin panel:</p>
          <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || ''}/admin/access-codes">Open admin panel</a></p>
        `,
      }).catch((e) => console.error('Resend error', e));
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
