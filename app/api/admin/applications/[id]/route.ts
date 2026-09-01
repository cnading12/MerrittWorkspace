import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { sendOnboardingMagicLink } from '@/lib/portal/magicLink';
import { planForMembershipType } from '@/lib/portal/pricing';
import { isTrialApplication } from '@/lib/portal/trialApplication';
import { isHandled, isDismissedInPayload } from '@/lib/portal/applicationQueue';
import { isMissingArchivedColumnError } from '@/lib/portal/archive';

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
    //
    // TWO writes, not one, and deliberately not in the same statement.
    //
    // `status` on this table has not been trustworthy: it is why the trial
    // read stopped selecting on it, and a Dismiss that writes nothing but
    // `status` inherits every problem that column has — a constraint it
    // fails, a value it will not take, a column-level grant it does not
    // have. One failed statement then loses the whole dismissal.
    //
    // So a dismissal is also recorded in `payload.dismissed_at`, which is
    // the column this row was written through in the first place and which
    // the ID-failure flag already updates. The two go in separately, and the
    // dismissal counts if EITHER lands — `isHandled` in
    // lib/portal/applicationQueue.ts reads both. Only when both fail is
    // this an error.
    if (action === 'decline' || action === 'restore') {
      const now = new Date().toISOString();
      const dismissing = action === 'decline';
      const existingPayload = (app.payload as Record<string, unknown> | null) || {};

      // Write 1 — the payload marker, on its own so `status` cannot take it
      // down with it.
      const nextPayload = { ...existingPayload };
      if (dismissing) {
        nextPayload.dismissed_at = now;
        nextPayload.dismissed_by = admin.id;
      } else {
        delete nextPayload.dismissed_at;
        delete nextPayload.dismissed_by;
      }
      const { data: payloadRow, error: payloadError } = await sb
        .from('member_applications')
        .update({ payload: nextPayload })
        .eq('id', id)
        .select('id')
        .maybeSingle();
      const payloadWritten = !payloadError && !!payloadRow;
      if (payloadError) {
        console.error(`⚠️ ${action}: payload marker failed for ${id}:`, payloadError);
      }

      // Write 2 — the status column, which is what a membership decline
      // means and what the rest of the app reads for a full application.
      const statusPatch = dismissing
        ? {
            status: 'declined',
            decision_note: decision_note || null,
            decided_by: admin.id,
            decided_at: now,
          }
        : { status: 'pending', decision_note: null, decided_by: null, decided_at: null };
      const { data: statusRow, error: statusError } = await sb
        .from('member_applications')
        .update(statusPatch)
        .eq('id', id)
        .select('id, status')
        .maybeSingle();
      const statusWritten = !statusError && !!statusRow;
      if (statusError) {
        console.error(`⚠️ ${action}: status write failed for ${id}:`, statusError);
      }

      if (!payloadWritten && !statusWritten) {
        const reason =
          payloadError?.message ||
          statusError?.message ||
          'the update matched no row — it may have been removed';
        console.error(`❌ Failed to ${action} application ${id}: ${reason}`);
        return NextResponse.json(
          {
            error: `Could not ${dismissing ? 'dismiss' : 'restore'} this application: ${reason}`,
          },
          { status: payloadError || statusError ? 500 : 409 }
        );
      }

      // Trust nothing either write claimed: read the row back fresh and ask
      // the same question the queue will ask on the page's very next load.
      // "The button said Dismissed and the card came straight back" is the
      // symptom this endpoint keeps producing new versions of, and the only
      // answer that closes it is the row itself, after the writes, saying
      // whether it is out of the queue.
      const { data: verifyRow, error: verifyError } = await sb
        .from('member_applications')
        .select('*')
        .eq('id', id)
        .single();
      const verified =
        !verifyError && verifyRow
          ? {
              status: verifyRow.status ?? null,
              dismissed_marker: isDismissedInPayload(verifyRow),
              hidden_from_queue: isHandled(verifyRow),
            }
          : null;
      if (verifyError) {
        console.error(`⚠️ ${action}: could not read the row back to verify:`, verifyError);
      }

      // A write that reported success but did not stick (a trigger reverted
      // it, a different table answered, a replica lag we do not know about)
      // must be an error, not a green banner over an unchanged queue.
      if (verified && verified.hidden_from_queue !== dismissing) {
        const wanted = dismissing ? 'dismiss' : 'restore';
        console.error(
          `❌ ${wanted} of ${id} reported success but did not stick; row reads`,
          verified
        );
        return NextResponse.json(
          {
            error:
              `The ${wanted} reported success but did not stick: read back fresh, the row ` +
              `has status ${JSON.stringify(verified.status)} and its dismissal marker is ` +
              `${verified.dismissed_marker ? 'present' : 'absent'}, so the queue will ` +
              `${dismissing ? 'still show it' : 'still hide it'}. The database accepted the ` +
              `write and then did not keep it — please send this exact message to support.`,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        id,
        // What actually landed, so the panel can say so rather than the
        // admin having to infer it from the row reappearing.
        status: statusRow?.status ?? null,
        status_written: statusWritten,
        payload_written: payloadWritten,
        dismissed: dismissing,
        verified,
      });
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
      userId = await findAuthUserIdByEmail(sb, app.email);
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

    // `user_id` is only written when the lookup actually found one. The row
    // this upsert may be UPDATING (same email, previous membership) already
    // carries the link between that person's auth account and their member
    // record — it is how requireMember finds them — and an upsert that writes
    // `user_id: null` over it silently signs them out of their own portal:
    // the approval looks perfect from the admin panel while their next login
    // answers "Member not found".
    const memberRow: Record<string, unknown> = {
      email: app.email,
      first_name: app.first_name,
      last_name: app.last_name,
      phone: app.phone,
      company_name: app.company_name,
      status: 'approved',
      application_id: app.id,
      designation: plan?.designation ?? null,
      monthly_cost_cents: monthlyCostCents,
    };
    if (userId) memberRow.user_id = userId;
    // The upsert keys on email, so approving someone who was a member before
    // UPDATES their old row — including one that was archived after a
    // cancellation. An archived row is hidden from the member list and the
    // totals, so without clearing the marker the approval "works" (member
    // created, invitation emailed, onboarding running) while the member is
    // nowhere on the Members page. Approval means they are back: un-archive.
    let { data: member, error: memErr } = await sb
      .from('members')
      .upsert({ ...memberRow, archived_at: null, archived_by: null }, { onConflict: 'email' })
      .select()
      .single();
    if (memErr && isMissingArchivedColumnError(memErr)) {
      // Database without 20260625_member_archive.sql: nothing can be
      // archived there, so the plain row is equivalent.
      ({ data: member, error: memErr } = await sb
        .from('members')
        .upsert(memberRow, { onConflict: 'email' })
        .select()
        .single());
    }
    if (memErr || !member) {
      return NextResponse.json(
        { error: memErr?.message || 'The member row could not be created.' },
        { status: 500 }
      );
    }

    // 3. Mark application approved.
    //
    // Not fatal — the member row exists and the invitation is about to go
    // out, so failing the request here would tell the admin nothing
    // happened when most of it did. But it is not silent either: the queue
    // drops a card because its status reads `approved`, so an application
    // this write skips stays on screen looking exactly like an Approve
    // button that did nothing — and is how the same person gets approved
    // twice. The result is read back and reported so the panel can say so.
    const { data: markedRow, error: markError } = await sb
      .from('member_applications')
      .update({
        status: 'approved',
        member_id: member.id,
        decided_by: admin.id,
        decided_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, status')
      .maybeSingle();
    const applicationMarked = !markError && !!markedRow;
    if (!applicationMarked) {
      console.error(
        `⚠️ Approved application ${id} could not be marked approved:`,
        markError || 'the update matched no row'
      );
    }

    // 4. Generate a one-time sign-in link and send the welcome email.
    await sendOnboardingMagicLink({
      email: app.email,
      firstName: app.first_name,
    });

    return NextResponse.json({
      ok: true,
      member,
      // False means the member exists and was emailed, but the application
      // row still reads pending — its card will stay in the queue and must
      // not be approved a second time.
      application_marked: applicationMarked,
      ...(applicationMarked
        ? {}
        : {
            warning:
              `The member was created and invited, but the application could not be marked ` +
              `approved (${markError?.message || 'the update matched no row'}). Its card will ` +
              `stay in the queue — do not approve it again; dismiss it instead.`,
          }),
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

// Find the auth user for an email that createUser said already exists.
//
// `listUsers()` with no arguments returns ONE page — 50 users — and this
// lookup used to read exactly that and stop. Every approval of a returning
// member on a project with more than 50 auth accounts then "found" nobody,
// and the member row was written without its user_id. The comparison is
// case-insensitive for the same reason: auth stores what the person typed at
// sign-up, the application holds what they typed this time, and emails
// differing only in case are the same mailbox.
async function findAuthUserIdByEmail(
  sb: ReturnType<typeof getServiceSupabase>,
  email: string
): Promise<string | null> {
  const wanted = String(email || '').toLowerCase();
  if (!wanted) return null;
  const perPage = 1000;
  // 50 pages of 1000 is far beyond this project's user count; the cap only
  // exists so a paging bug cannot loop forever.
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) return null;
    const hit = data.users.find((u) => (u.email || '').toLowerCase() === wanted);
    if (hit) return hit.id;
    if (data.users.length < perPage) return null;
  }
  return null;
}
