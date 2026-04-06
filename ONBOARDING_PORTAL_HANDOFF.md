# Onboarding Portal — Handoff

This branch (`claude/review-onboarding-design-NKnhC`) lays the foundation for
the auto-charge member onboarding portal + admin panel described in the
hand-written planning notes. Below is what's done, what's left, and a
ready-to-paste prompt for the next Claude Code session.

## What's done

### Database (`supabase/migrations/20260406_onboarding_portal.sql`)
- `members` — one row per accepted member (linked to `auth.users`), with
  status, designation, monthly_cost_cents, Stripe IDs, gates
  (`required_docs_complete`, `agreement_signed`, `onboarding_unlocked`),
  and `access_code`.
- `member_applications` — raw application form submissions with pending /
  approved / declined status.
- `member_documents` — uploaded files (Supabase Storage bucket
  `member-documents`).
- `member_agreements` — signature records for member agreement + T&C.
- `payment_history` — synced from Stripe webhooks.
- `access_code_requests` — member request → admin fulfills with code from POPS.
- `admin_users` — gate for admin panel access.
- RLS policies (members can only see their own rows; `is_admin()` helper for
  admin access).

### Member portal — `/portal`
- `app/portal/login/page.tsx` — Supabase Auth sign in (password or magic link).
- `app/portal/page.tsx` — dashboard with progress bar + tabs:
  - **Documents tab** — uploads required docs (photo ID, proof of address) and
    signs Member Agreement / Terms.
  - **Payments tab** — shows assigned monthly cost, "Set up auto-pay" button
    that creates a Stripe Checkout subscription session, payment history table.
  - **Onboarding tab** — locked until subscription is active. Shows building
    info, request access code button, member referral blurb.

### Admin panel — `/admin`
- `app/admin/page.tsx` — sign in screen (admin presence verified via API).
- `app/admin/applications/page.tsx` — list pending applications, approve/decline.
- `app/admin/members/page.tsx` — list all members, set designation,
  monthly cost, pause/activate.
- `app/admin/access-codes/page.tsx` — pending access code requests, enter code
  from POPS, send to member via Resend.

### API routes
- `POST /api/portal/documents` — file upload to Supabase Storage, recomputes
  `required_docs_complete`.
- `POST /api/portal/sign-agreement` — records signature, flips
  `agreement_signed` when both docs are signed.
- `POST /api/portal/create-subscription` — creates Stripe Checkout session
  with monthly recurring price, billing anchored to 1st of next month and
  proration enabled for the first charge.
- `POST /api/portal/request-access-code` — creates request row, emails admin.
- `GET  /api/portal/me` — returns member + documents + payments.
- `POST /api/webhooks/subscriptions` — Stripe webhook for subscription +
  invoice events. Sets `onboarding_unlocked = true` on
  `checkout.session.completed`. Inserts into `payment_history` for invoices.
- `GET /api/admin/whoami` — admin gate check.
- `GET /api/admin/applications` + `POST /api/admin/applications/[id]` — list +
  approve/decline. Approve creates `members` row, invites the user via
  `supabase.auth.admin.inviteUserByEmail`, and emails them next steps.
- `GET /api/admin/members` + `PATCH /api/admin/members/[id]` — list + update
  (designation, monthly_cost_cents, status, access_code).
- `GET /api/admin/access-codes` + `POST /api/admin/access-codes/[id]` — list
  pending requests + fulfill (saves code, emails member).

### Existing form integration
`app/api/membership-application/route.ts` was edited to ALSO insert into
`member_applications` so submissions show up in the admin panel. The existing
Resend emails still go out unchanged.

### New libs
- `lib/portal/types.ts` — shared TypeScript types and labels.
- `lib/portal/supabaseAdmin.ts` — service-role Supabase client (server only).
- `lib/portal/auth.ts` — `requireMember()` and `requireAdmin()` helpers that
  read `Authorization: Bearer <token>` from API requests.

## Setup steps before this works end-to-end

1. **Run the SQL migration** in Supabase SQL editor:
   `supabase/migrations/20260406_onboarding_portal.sql`.
2. **Create the Storage bucket** `member-documents` (private). Add policies:
   - allow authenticated users to read/write objects whose path starts with
     their `member_id` (or just rely on the API route, which uses service role).
3. **Insert yourself into `admin_users`**:
   ```sql
   insert into admin_users (user_id, email, role)
   values ('<your auth.users uuid>', 'cole@...', 'superadmin');
   ```
4. **Env vars** to add to `.env.local` (and Vercel):
   - `SUPABASE_SERVICE_ROLE_KEY` — service role key (NOT the anon key).
   - `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET` — separate webhook secret for
     `/api/webhooks/subscriptions`.
   - Confirm `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_BASE_URL`,
     `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.
5. **Stripe webhook** in dashboard → endpoint
   `https://merrittworkspace.net/api/webhooks/subscriptions` with events:
   - `checkout.session.completed`
   - `customer.subscription.created/updated/deleted`
   - `invoice.paid`, `invoice.payment_failed`
6. **Supabase Auth** → enable Email provider, set Site URL to your domain,
   add `/portal` to redirect allowlist.

## What's NOT done yet (next session pickup)

1. **Member detail page** `app/admin/members/[id]/page.tsx` — view full app
   payload, uploaded docs (signed URLs), payment history, agreements, manual
   subscription cancel/refund actions.
2. **Document review UI** — admin approve/reject individual uploaded docs.
3. **Storage bucket policies** — write a SQL snippet for storage RLS (the
   migration just notes them in a comment block).
4. **Email styling** — current Resend emails are minimal HTML. Match the
   existing branded templates in `lib/resend.ts`.
5. **First-charge proration verification** — currently we send the standard
   Stripe-prorated subscription with `billing_cycle_anchor` = 1st of next
   month. Confirm this matches Cole's intent ("charged on first of month
   (prorated)") and add a one-time invoice item if needed.
6. **Member self-service** — change payment method, cancel/pause from portal
   (Stripe customer portal session would be ideal — add an endpoint that
   creates `stripe.billingPortal.sessions.create`).
7. **Application form rewrite** — `app/membership/apply/page.tsx` already
   exists and is huge. It should be tightened so the fields it collects map
   cleanly into `member_applications` (currently we save the whole payload as
   JSON, which works but is messy). Also: today the user submits the form
   without an account; consider whether we want them to create their auth
   user at submission time (so they can sign back in to check status) or
   only after approval (current flow).
8. **Tests** — none yet. Add at minimum: API route smoke tests for the auth
   gates and approval flow.
9. **Empty `app/api/portal/signup` directory** — created but unused; either
   delete or implement self-signup flow.

## Quick prompt for the next session

Paste this into a new Claude Code conversation:

> I'm continuing work on the member onboarding portal in
> `cnading12/MerrittWorkspace` on branch `claude/review-onboarding-design-NKnhC`.
> Read `ONBOARDING_PORTAL_HANDOFF.md` first — it explains everything that's
> already built (DB schema, /portal pages, /admin pages, API routes, Stripe
> subscription webhook).
>
> Pick up the "What's NOT done yet" list. Start with:
>
> 1. Add a member detail page at `app/admin/members/[id]/page.tsx` that shows
>    the full application payload, lets the admin view signed URLs for uploaded
>    documents, approve/reject docs individually, and displays payment history
>    + agreements.
> 2. Add storage RLS policies to a new migration file.
> 3. Add a `/api/portal/billing-portal-session` endpoint that returns a Stripe
>    customer billing portal URL, and a "Manage payment method" button on the
>    Payments tab that uses it.
> 4. Match the Resend email HTML to the branded templates already in
>    `lib/resend.ts`.
>
> Don't reimplement what's already there — extend it. Commit and push to the
> same branch.
