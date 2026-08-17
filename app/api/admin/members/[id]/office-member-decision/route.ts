// POST /api/admin/members/[id]/office-member-decision
//
// One-click approve/decline for pending OFFICE MEMBERS — people who signed
// up to join a private office that someone else pays for (designation
// 'office_member', status 'pending'). Approval activates the account and
// unlocks the portal (conference booking against the office's shared hours,
// snack shop member checkout, access-code requests). Decline marks the
// member declined and keeps everything locked.
//
// Body: { decision: 'approve' | 'decline' }

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { PORTAL_ONBOARDING_FROM, PORTAL_REPLY_TO } from '@/lib/portal/emails';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const decision = body?.decision;
    if (decision !== 'approve' && decision !== 'decline') {
      return NextResponse.json(
        { error: "decision must be 'approve' or 'decline'" },
        { status: 400 }
      );
    }

    const sb = getServiceSupabase();
    const { data: member, error: memErr } = await sb
      .from('members')
      .select('*')
      .eq('id', id)
      .single();
    if (memErr || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    if (member.designation !== 'office_member') {
      return NextResponse.json(
        { error: 'This member is not an office member.' },
        { status: 400 }
      );
    }
    if (member.status !== 'pending') {
      return NextResponse.json(
        { error: `This office member is already ${member.status}.` },
        { status: 409 }
      );
    }

    const update =
      decision === 'approve'
        ? { status: 'active', onboarding_unlocked: true }
        : { status: 'declined' };
    const { data: updated, error: updErr } = await sb
      .from('members')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (updErr) throw new Error(updErr.message);

    // Tell the member. Best-effort — the decision itself already landed.
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const portalUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/portal`;
        const approved = decision === 'approve';
        const html = approved
          ? `
            <div style="font-family:Arial,sans-serif;line-height:1.5;color:#333;">
              <h2 style="color:#16a34a;">You're in — welcome to Merritt Workspace!</h2>
              <p>Hi ${member.first_name},</p>
              <p>Your request to join <strong>Office ${member.office_number || ''}</strong> has been
              approved. Your portal account is fully unlocked:</p>
              <ul>
                <li>Book the conference room using your office's shared included hours</li>
                <li>Order from the snack shop</li>
                <li>Request a building access code — only needed for late-evening and weekend entry</li>
              </ul>
              <p><strong>You don't need an access code during business hours.</strong> The
              building is unlocked Monday through Friday, 8:00 AM – 6:00 PM — just walk in.</p>
              <p><a href="${portalUrl}">Open your member portal</a> to get started.</p>
            </div>
          `
          : `
            <div style="font-family:Arial,sans-serif;line-height:1.5;color:#333;">
              <p>Hi ${member.first_name},</p>
              <p>We couldn't approve your request to join Office ${member.office_number || ''}
              at Merritt Workspace. If you believe this is a mistake, please reply to this
              email or contact member services and we'll sort it out.</p>
            </div>
          `;
        await resend.emails.send({
          from: PORTAL_ONBOARDING_FROM,
          to: [member.email],
          replyTo: PORTAL_REPLY_TO,
          subject: approved
            ? `You're approved — Office ${member.office_number || ''} at Merritt Workspace`
            : 'About your Merritt Workspace office member request',
          html,
        });
      } catch (e) {
        console.error('⚠️ Failed to send office-member decision email:', e);
      }
    }

    return NextResponse.json({ member: updated });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
