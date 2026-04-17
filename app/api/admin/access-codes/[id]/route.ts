import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import {
  accessCodeIssuedEmail,
  PORTAL_FROM,
  PORTAL_REPLY_TO,
} from '@/lib/portal/emails';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await requireAdmin(req);
    const { access_code } = await req.json();
    if (!access_code || typeof access_code !== 'string') {
      return NextResponse.json({ error: 'access_code required' }, { status: 400 });
    }

    const sb = getServiceSupabase();
    const { data: reqRow, error } = await sb
      .from('access_code_requests')
      .select('id, member_id, members(first_name,last_name,email)')
      .eq('id', id)
      .single();
    if (error || !reqRow) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    await sb
      .from('access_code_requests')
      .update({
        status: 'fulfilled',
        access_code,
        fulfilled_at: new Date().toISOString(),
        fulfilled_by: admin.id,
      })
      .eq('id', id);

    await sb
      .from('members')
      .update({
        access_code,
        access_code_issued_at: new Date().toISOString(),
      })
      .eq('id', reqRow.member_id);

    const member: any = (reqRow as any).members;
    if (process.env.RESEND_API_KEY && member?.email) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const tpl = accessCodeIssuedEmail({
        firstName: member.first_name,
        accessCode: access_code,
      });
      await resend.emails
        .send({
          from: PORTAL_FROM,
          to: member.email,
          replyTo: PORTAL_REPLY_TO,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        })
        .catch((e) => console.error('Resend error', e));
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
