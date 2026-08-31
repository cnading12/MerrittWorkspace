import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { sendOnboardingMagicLink } from '@/lib/portal/magicLink';
import { planForMembershipType } from '@/lib/portal/pricing';
import { isTrialApplication } from '@/lib/portal/trialApplication';

export const dynamic = 'force-dynamic';

// Approve, decline or restore an application.
// On approve: create a `members` row, invite the user via Supabase Auth
// (passwordless magic link), and email them with portal sign-in info.
//
// `decline` is what the trial tab calls "Dismiss" — clearing a visit out of
// the queue once it has happened. Every write below reports whether it
// actually landed. It used to discard the result of its own update and
// answer `{ ok: true }` regardless, which is the worst possible shape for
// this button: the card disappeared from the screen, the row was untouched,
// and it came back on the next load with nothing anywhere saying why.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await requireAdmin(req);
    const { action, decision_note } = await req.json();
    if (!['approve', 'decline', 'restore'].includes(action)) {
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

    // A trial-day application is not a membership application and must not
    // be approved into one. It carries no plan, no references, and no
    // emergency contact — approving it would create a `members` row at a
    // guessed price and email a portal invitation to someone who only asked
    // to sit at a desk for a day. They convert by completing the full
    // application (see the resume link in the post-trial email), and that
    // submission is what gets approved.
    //
    // Declining stays available: it is how staff clear a trial row out of the
    // queue once the visit is done.
    if (action === 'approve' && isTrialApplication(app)) {
      return NextResponse.json(
        {
          error:
            'This is a trial day application, not a membership application. Send them the membership application to fill in, then approve that.',
        },
        { status: 400 }
      );
    }

    // Dismiss / decline, and its undo.
    //
    // Restoring matters more here than it looks. Dismissing a trial day is
    // one click next to "View application", and a visit that gets dismissed
    // by a misclick is exactly the thing this whole screen exists to stop
    // losing — so the state has to be reversible from the panel rather than
    // from the SQL editor.
    if (action === 'decline' || action === 'restore') {
      const patch =
        action === 'decline'
          ? {
              status: 'declined',
              decision_note: decision_note || null,
              decided_by: admin.id,
              decided_at: new Date().toISOString(),
            }
          : { status: 'pending', decision_note: null, decided_by: null, decided_at: null };

      // `select()` so the write is verified rather than assumed: it turns a
      // failed update into an error the admin sees, and a matched-nothing
      // update into a 409 instead of a silent no-op.
      const { data: updated, error: writeError } = await sb
        .from('member_applications')
        .update(patch)
        .eq('id', id)
        .select('id, status')
        .maybeSingle();

      if (writeError) {
        console.error(
          `❌ Failed to ${action} application ${id}:`,
          writeError
        );
        return NextResponse.json(
          {
            error:
              action === 'decline'
                ? `Could not dismiss this application: ${writeError.message}`
                : `Could not restore this application: ${writeError.message}`,
          },
          { status: 500 }
        );
      }
      if (!updated) {
        return NextResponse.json(
          {
            error:
              'That application was not updated — it may have been removed. Reload the queue.',
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ ok: true, id: updated.id, status: updated.status });
    }

    // Approve flow
    // 1. Ensure an auth.users row exists for this email. We use createUser
    //    (instead of inviteUserByEmail) so Supabase's built-in SMTP — which
    //    is rate-limited to a handful of messages per hour — is never used.
    //    We send the invite ourselves below via Resend.
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

    // 2. Create or update the member row. Auto-assign the designation and
    //    monthly cost so the fee agreement and Stripe checkout can reference
    //    a real number without any manual accountant step.
    //
    //    For multi-plan applications (multiple offices and/or dedicated desks
    //    on a single submission), the applicant's combined total is stored
    //    in payload.total_monthly_cost_cents. Prefer that when present so
    //    the member's recurring charge totals every selection. Fall back to
    //    the single-plan lookup for legacy applications.
    const plan = planForMembershipType(app.membership_type);
    const payload = (app.payload as Record<string, any> | null) || {};
    const payloadMonthly = Number(payload.total_monthly_cost_cents);
    const monthlyCostCents = Number.isFinite(payloadMonthly) && payloadMonthly > 0
      ? payloadMonthly
      : plan?.monthly_cost_cents ?? null;

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
          designation: plan?.designation ?? null,
          monthly_cost_cents: monthlyCostCents,
        },
        { onConflict: 'email' }
      )
      .select()
      .single();
    if (memErr) {
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }

    // 3. Mark application approved.
    //
    // Not fatal — the member row exists and the invitation is about to go
    // out, so failing the request here would tell the admin nothing
    // happened when most of it did. But it is not silent either: an
    // application still reading `pending` after an approval is how the same
    // person gets approved twice.
    const { error: markError } = await sb
      .from('member_applications')
      .update({
        status: 'approved',
        member_id: member.id,
        decided_by: admin.id,
        decided_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (markError) {
      console.error(`⚠️ Approved application ${id} could not be marked approved:`, markError);
    }

    // 4. Generate a one-time sign-in link and send the welcome email.
    await sendOnboardingMagicLink({
      email: app.email,
      firstName: app.first_name,
    });

    return NextResponse.json({ ok: true, member });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
