import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin(req);
    const { access_code } = await req.json();
    if (!access_code || typeof access_code !== 'string') {
      return NextResponse.json({ error: 'access_code required' }, { status: 400 });
    }

    const sb = getServiceSupabase();
    const { data: reqRow, error } = await sb
      .from('access_code_requests')
      .select('id, member_id, members(first_name,last_name,email)')
      .eq('id', params.id)
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
      .eq('id', params.id);

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
      await resend.emails
        .send({
          from: 'Merritt Workspace <manager@merrittworkspace.net>',
          to: member.email,
          subject: 'Your Merritt Workspace Access Code',
          html: `
            <p>Hello ${member.first_name},</p>
            <p>Your personal 24/7 building access code is:</p>
            <p style="font-size:28px;font-weight:bold;letter-spacing:4px;font-family:monospace;">${access_code}</p>
            <p>Use this code outside business hours (8 AM – 6 PM). During business hours the
            main entrance is unlocked—just walk in.</p>
            <p>Keep this code confidential. Contact us if you have any issues.</p>
            <p>— Merritt Workspace</p>
          `,
        })
        .catch((e) => console.error('Resend error', e));
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
