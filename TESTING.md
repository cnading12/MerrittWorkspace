# Testing Merritt Workspace before a release

The site takes money, provisions door access, and sends mail that cannot be
unsent. This is the process for convincing yourself a batch of changes did not
break any of that.

Two layers, in order. **Never skip layer 1** — it is one command and it fails
in seconds. **Do layer 2 in proportion to what changed**, using the risk map to
decide how much.

---

## Layer 1 — the automated gate

```bash
npm run verify
```

Runs, in this order, stopping at the first failure:

| Step | Command | What it catches |
| --- | --- | --- |
| Clean | `npm run clean` | Stale `.next` output typechecked as if current — see below |
| Typecheck | `npm run typecheck` | Renamed fields, changed function signatures, drifted types across the ~69 API routes |
| Unit tests | `npm test` | Business-rule regressions — 550 tests over `lib/` |
| Production build | `npm run build:check` | Anything that compiles locally but dies in Vercel's build |

Green in about 90 seconds. If it is red, stop; nothing below is worth doing
until it is green again.

### Why `build:check` and not `npm run build`

Several API routes construct their Stripe client at module scope, and
`next build` imports every route to collect page data. With no environment at
all the build dies on the first one it reaches:

```
Error: Neither apiKey nor config.authenticator provided
```

That is a missing variable, not a broken build. `scripts/build-check.sh`
supplies placeholder values for the module-scope clients — nothing real,
nothing dialled, no network calls — and only fills in variables you have not
already set, so running it with a real `.env.local` loaded still checks your
real configuration.

### If typecheck fails inside `.next/`

Errors in `.next/types/**` — "Cannot find module '../../app/membership/page.js'",
or a route handler whose `params` should be a `Promise` — are stale build
output, not your code. `tsconfig.json` includes `.next/types/**/*.ts`, so a
`.next` left over from an older commit (or an older Next version) gets
typechecked as if it were current.

`npm run verify` deletes `.next` first, so this cannot happen through the
gate. If you hit it running `npm run typecheck` on its own, run `npm run
clean` and try again.

### Lint is advisory, not a gate

```bash
npm run lint
```

`npm run lint` used to be `next lint`, which in Next 14 reads only `.eslintrc`;
against this repo's flat `eslint.config.mjs` it found no config and dropped
into an interactive setup prompt, so it could never run unattended. It is now
`eslint .` and runs clean.

It reports **486 errors and 4 warnings** as of this writing, essentially all
pre-existing: 436 `no-explicit-any`, 27 `no-unescaped-entities`, 21
`no-unused-vars`. So it cannot block a release today. Use it as a diff:

```bash
npm run lint 2>&1 | tail -3    # expect 490 problems; more means you added some
```

If you want it to become a real gate, the cheap path is downgrading
`@typescript-eslint/no-explicit-any` to `warn` in `eslint.config.mjs` and
fixing the ~50 findings that remain. That is a decision about house style, not
a testing decision, which is why this document does not make it for you.

---

## What the automated layer does *not* cover

This is the important part, and it is why layer 2 exists.

The 550 tests are strong where it counts — pricing, allocations, capacity,
availability windows, auth helpers, email content, the SEO fact agreement. But:

- **8 of 69 API routes have route-level tests.** The rest are exercised only
  through the `lib/` functions they call.
- **No test renders a page or drives a browser.** Every form, every button,
  every fetch from a client component is untested.
- **No test talks to Stripe, Supabase, Resend, or Google Calendar.** Every
  test double is hand-written.
- **Migrations are applied by hand** (`supabase/migrations/`), so schema drift
  between the code and the live database is invisible to every check above.

Translation: the automated layer catches *"we changed a rule and forgot a
consequence."* It does not catch *"the wiring came loose"* — a renamed form
field, a webhook secret pointed at the wrong endpoint, a migration nobody ran.
That is exactly the failure mode of a large batch of changes, and only layer 2
finds it.

---

## Layer 2 — the manual smoke test

### Setup, once

1. Copy `.env.example` to `.env.local` and fill it with **Stripe test-mode**
   keys and a **non-production Supabase project**. Never smoke-test against
   live keys — these flows send real mail and take real money.
2. `npm run dev`
3. Forward webhooks, or nothing downstream of a payment will ever fire:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/subscriptions
   stripe listen --forward-to localhost:3000/api/webhooks/snack-shop
   stripe listen --forward-to localhost:3000/api/webhooks/meeting-rooms
   ```
   Each prints a `whsec_…`. They are **three different secrets** for three
   different env vars — `STRIPE_SUBSCRIPTION_WEBHOOK_SECRET`,
   `STRIPE_WEBHOOK_SECRET_SNACKSHOP`, `STRIPE_WEBHOOK_SECRET`. Crossing them
   is the single most common way this environment "mysteriously" stops
   recording payments.
4. Test cards: `4242 4242 4242 4242` succeeds, `4000 0000 0000 9995` declines
   for insufficient funds, `4000 0025 0000 3155` demands 3D Secure. Any future
   expiry, any CVC.

### Risk map — how much to do

Work top-down and stop where the risk stops matching your diff.

| Priority | Flow | Test when you touched | Reversible? |
| --- | --- | --- | --- |
| P0 | Membership application → approval → subscription | `app/api/membership-application/*`, `app/api/admin/applications/*`, `app/api/portal/create-subscription`, `lib/portal/pricing.ts`, `lib/portal/signupEmails.ts` | No — charges a card, sends mail |
| P0 | Subscription webhooks | `app/api/webhooks/subscriptions`, `lib/portal/stripeSubscription.ts` | No — writes payment history |
| P0 | Cancel / refund | `app/api/portal/cancel-subscription`, `app/api/admin/members/[id]/refund`, `.../cancel-subscription` | No — moves money |
| P1 | Conference room booking | `app/api/bookings/*`, `app/api/create-meeting-checkout`, `lib/bookings/*`, `lib/google-calendar.ts` | Partly — writes a calendar event |
| P1 | Snack shop | `app/api/snackshop/*`, `app/api/create-checkout-session`, `lib/snackshop/*` | No — charges a card |
| P1 | Flex space booking | `app/api/flex-bookings/*`, `components/portal/FlexCalendar.tsx` | Partly |
| P2 | Portal sign-in and member panels | `app/portal/*`, `lib/portal/auth.ts`, `app/api/portal/me` | Yes |
| P2 | Admin panels | `app/admin/*`, `app/api/admin/*` | Varies |
| P3 | Public pages and published facts | `lib/seo/*`, `lib/hours.ts`, marketing pages | Yes |

---

### P0 · Membership application → member

This is the longest chain on the site and the one most worth walking end to
end. Each arrow is a place it has broken before.

1. **Apply.** `/membership/apply` → pick a plan → submit.
   - The plan's price on the form must match `lib/portal/pricing.ts`. The
     server re-prices from `PLAN_CATALOG` and ignores what the form sent, so a
     mismatch here is a *display* bug that quotes the applicant a number they
     will not be charged.
   - Day passes are retired: `one_day_dedicated_desk` must not be offered.
   - Staff notification email arrives.
   - Submit twice quickly — the second should be rate-limited (`429`), not a
     duplicate application.
2. **Trial variant.** `/membership/apply?trial=1` → the short form. Confirm
   the trial-day email arrives and `wants_trial_day` / `trial_date` land on
   the row.
3. **Approve.** `/admin/applications` → open it → approve.
   - Designation and `monthly_cost_cents` populate automatically from
     `pricing.ts`. Check the number.
   - Invitation email arrives at the applicant's address.
4. **Set password.** Follow the invite → `/portal/set-password` → choose one.
5. **Sign in.** `/portal/login` — email + password (not a magic link).
6. **Sign the agreement**, then **pay**: `/api/portal/create-subscription` →
   Stripe Checkout → `4242…`.
7. **Webhook lands.** Watch `stripe listen`. Confirm `checkout.session
   .completed` and `invoice.paid` are both received, payment history gains a
   row, and the welcome/completion email fires **once** — not twice, not zero
   times.
8. **Portal reflects it.** `/portal` shows the right plan, the right conference
   allowance, and the right flex allowance for that tier.

Repeat step 6 with `4000 0000 0000 9995`. The member must land in a clearly
unpaid state with a retry available — never a half-provisioned account.

**Café membership deserves its own pass** (`cafe_membership`, $100/mo). It has
no desk, so none of `deskAvailability.ts` applies. Confirm: no desk is
assigned, the headcount counts against `CAFE_MEMBER_LIMIT` in
`lib/portal/cafeAvailability.ts`, and the allowances are exactly half a
dedicated desk's — 2 conference hours a month, 2 flex hours a week. Being over
the cap is a supported state, not a bug; the code must not report negative
headroom.

### P0 · Cancel and refund

- **Member self-cancel** — `/portal` → cancel → confirm the Stripe subscription
  actually enters `cancel_at_period_end`, the cancellation email goes out, and
  access persists until the period ends.
- **Onboarding cancel** — `/portal/cancel-onboarding` with a token from
  `lib/portal/cancelToken.ts`. Test a valid token, an expired one, and a
  tampered one. Only the first should work.
- **Admin refund** — `/admin/members/[id]` → refund → confirm Stripe shows it,
  `charge.refunded` arrives, and payment history reflects it.
- **Admin archive vs delete** — these are different operations with different
  blast radii. Archive preserves the record; delete does not. Verify on a
  throwaway member which one you actually got.

### P1 · Conference room booking

1. `/member-resources/meeting-rooms` → pick a slot.
2. As a **guest**: pay → `checkout.session.completed` on the meeting-rooms
   webhook → confirmation email → Google Calendar event created on
   `GOOGLE_CALENDAR_ID`.
3. As a **member**: included hours draw down first
   (`lib/bookings/conference-hours.ts`); only the overage is charged.
4. **Double-book on purpose.** Book the same slot twice. The second attempt
   must be refused, not silently accepted.
5. Check peak vs off-peak pricing (`lib/bookings/peak.ts`) and that a booking
   outside business hours behaves per `lib/hours.ts`.

### P1 · Snack shop

1. `/member-resources/snackshop` → build a cart → guest checkout →
   `4242…`.
2. **Tamper with the price.** In DevTools, change a cart item's `price` before
   submitting. The server must recompute from the catalog and charge the real
   amount. `security-hardening.test.ts` asserts this at the unit level; confirm
   the route honours it.
3. Order confirmation email arrives; the order lands in `snack_orders`.
4. As a member, `/api/snackshop/member-checkout` should use the saved card
   (`lib/stripe/savedCard.ts`) and skip re-entry.

### P1 · Flex space

- **Signed out**, load `/member-resources/flex-space`. The calendar must
  render. This endpoint takes *optional* auth on purpose — a sign-in wall here
  is a regression, not a fix.
- The response must contain **time ranges only** — no name, email, member id,
  or event title. Check the network tab, not just the UI.
- **Signed in**, your own bookings come back flagged `is_self`.
- Hammer it signed-out to confirm per-IP rate limiting; signed-in members are
  exempt.
- The grid must run `FLEX_OPEN_MINUTES`–`FLEX_CLOSE_MINUTES`. Book something
  in the **first hour of the day** and confirm it appears — a hardcoded window
  once silently dropped exactly those.

### P2 · Portal and admin

Portal: sign in, `/portal/activity`, documents upload (try an oversized file
and a wrong-type file — both must be refused), access-code request, billing
portal link.

Admin: `/admin/dashboard`, `/admin/members`, `/admin/seating`,
`/admin/access-codes`, `/admin/documents`. Then, **signed out**, hit an admin
API directly:

```bash
curl -i http://localhost:3000/api/admin/members
curl -i http://localhost:3000/api/admin/summary
```

Both must be 401/403. Every admin route currently carries a guard; this is the
check that it stays true.

### P3 · Published facts

Change a price or an hour in `lib/seo/business.ts`, `lib/seo/faqs.ts`, or
`lib/hours.ts` — never in the page that displays it — and then confirm all
four surfaces agree:

1. The visible page (`/membership`, `/member-resources/faqs`, homepage facts).
2. The JSON-LD (`components/LocalBusinessSchema.tsx`, `components/seo/*`) —
   paste `view-source` output into a structured-data validator.
3. `/llms.txt` and `/llms-full.txt`.
4. `curl -I` a few `next.config` shortcuts — `/pricing`, `/faq`, `/apply`,
   `/private-office` — and confirm 308s to the canonical paths.

`__tests__/seo-facts.test.ts` guards the machine-checkable part of that
agreement, and `membership-compare.test.ts` enforces that the comparison table
holds only rows that actually differ. Neither can tell you the copy reads well.

### Cron jobs

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/supabase-keep-alive
curl -i localhost:3000/api/cron/supabase-keep-alive          # expect 401
```

- **`supabase-keep-alive`** is load-bearing — see CLAUDE.md. It runs daily and
  must stay daily. Confirm it 200s with the secret and 401s without.
- **`monthly-dues-summary`** — same contract, except it runs *unauthenticated
  with a logged warning* if `CRON_SECRET` is unset, rather than refusing.
  Deliberate, but worth knowing when you test it.
- **`trial-followup`** is **not in `vercel.json`** — the Hobby plan allows two
  cron entries and both are taken. It runs on demand. If you expect it to be
  firing on a schedule, it is not; staff send follow-ups by hand from
  `/admin/applications`.

---

## Migrations — the check nothing else does

`supabase/migrations/` is applied **by hand in the Supabase SQL editor**. No
test, no build, and no deploy will tell you one is missing.

Before deploying, diff the migrations on your branch against what is actually
applied, and apply anything pending **before** the code that needs it goes out.
The most recent are `20260824_cafe_membership.sql` and
`20260824_trial_application_split.sql`.

The application route already carries a fallback for the trial-day columns
being absent — it retries the insert without them and warns. That means a
missing migration degrades *quietly*, which is exactly why this needs checking
by hand rather than being noticed later.

---

## Release checklist

```
[ ] npm run verify                          — green
[ ] npm run lint | tail -3                  — no more than the 490 baseline
[ ] Pending Supabase migrations applied
[ ] Layer 2 smoke test, down to the priority your diff reaches
[ ] Stripe: TEST mode used throughout; no live keys touched
[ ] Deploy
[ ] Post-deploy pass (below)
```

### Post-deploy, on production

1. Load the homepage, `/membership`, `/member-resources/faqs`,
   `/member-resources/flex-space` — signed out, in a private window.
2. `curl -I https://<domain>/pricing` and one other shortcut — expect 308.
3. `curl https://<domain>/llms.txt` — expect current facts.
4. Submit a real membership application as yourself, then delete it from
   `/admin/applications`. This is the only way to prove the live Resend and
   Supabase wiring works.
5. Stripe dashboard → Webhooks → confirm all three endpoints show recent
   successful deliveries and no failures.
6. Vercel → Cron → confirm `supabase-keep-alive` ran green within the last
   24 hours. A red run here is the one failure on this list that can take the
   whole site down later, quietly, a week from now.

---

## Where to add tests next

Ranked by risk covered per hour spent. Everything here is a route-level test in
the style of the eight that already exist in `__tests__/`:

1. **`app/api/webhooks/subscriptions`** already has one — extend it to the
   events it handles but does not yet assert: `invoice.payment_failed`,
   `invoice.payment_action_required`, `customer.subscription.deleted`.
2. **`app/api/membership-application/route.ts`** — the `PLAN_CATALOG`
   re-pricing, the retired day pass being unbuyable, the rate limit, and the
   missing-migration fallback path.
3. **`app/api/snackshop`, `app/api/create-checkout-session`** — the
   price-tampering defence at the route level, not just in `priceCart`.
4. **`app/api/bookings`** — double-booking refusal and included-hours drawdown.
5. **`app/api/flex-bookings/availability`** — that the anonymous response
   carries no member data, and that `is_self` appears only with a valid token.

A browser-level test would cover more than all five, but it needs Playwright and
a seeded database; the route tests need neither and can land one at a time.
