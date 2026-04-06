import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { membershipApprovedEmail, PORTAL_FROM } from '@/lib/portal/emails';

export const dynamic = 'force-dynamic';

// Approve or decline an application.
// On approve: create a `members` row, invite the user via Supabase Auth
// (passwordless magic link), and email them with portal sign-in info.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await requireAdmin(req);
    const { action, decision_note } = await req.json();
    if (!['approve', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const sb = getServiceSupabase();
    const { data: app, error } = await sb
      .from('member_applications')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (action === 'decline') {
      await sb
        .from('member_applications')
        .update({
          status: 'declined',
          decision_note: decision_note || null,
          decided_by: admin.id,
          decided_at: new Date().toISOString(),
        })
        .eq('id', id);
      return NextResponse.json({ ok: true });
    }

    // Approve flow
    // 1. Ensure an auth.users row exists for this email. We use createUser
    //    (instead of inviteUserByEmail) so Supabase's built-in SMTP — which
    //    is rate-limited to a handful of messages per hour — is never used.
    //    We send the invite ourselves below via Resend.
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const redirectTo = `${baseUrl}/portal/set-password`;

    let userId: string | null = null;
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email: app.email,
      email_confirm: true,
    });
    if (created?.user?.id) {
      userId = created.user.id;
    } else if (createErr && !createErr.message.toLowerCase().includes('already')) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }
    if (!userId) {
      const { data: list } = await sb.auth.admin.listUsers();
      userId = list.users.find((u) => u.email === app.email)?.id || null;
    }

    // 2. Generate a one-time sign-in link without triggering Supabase's mailer.
    //    `type: 'magiclink'` works for existing users and avoids the invite
    //    email being sent by Supabase directly.
    let actionLink: string | null = null;
    const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
      type: 'magiclink',
      email: app.email,
      options: { redirectTo },
    });
    if (linkErr) {
      console.error('generateLink error', linkErr);
    } else {
      actionLink = linkData?.properties?.action_link ?? null;
    }

    // 3. Create or update the member row.
    const { data: member, error: memErr } = await sb
      .from('members')
      .upsert(
        {
          user_id: userId,
          email: app.email,
          first_name: app.first_name,
          last_name: app.last_name,
          phone: app.phone,
          company_name: app.company_name,
          status: 'approved',
          application_id: app.id,
        },
        { onConflict: 'email' }
      )
      .select()
      .single();
    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }

    // 4. Mark application approved.
    await sb
      .from('member_applications')
      .update({
        status: 'approved',
        member_id: member.id,
        decided_by: admin.id,
        decided_at: new Date().toISOString(),
      })
      .eq('id', id);

    // 5. Send "next steps" email.
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const tpl = membershipApprovedEmail({
        firstName: app.first_name,
        portalUrl: actionLink || `${baseUrl}/portal/login`,
      });
      await resend.emails
        .send({
          from: PORTAL_FROM,
          to: app.email,
          subject: tpl.subject,
          html: tpl.html,
        })
        .catch((e) => console.error('Resend error', e));
    }

    return NextResponse.json({ ok: true, member });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
