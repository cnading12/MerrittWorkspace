# Notes for future sessions

Next.js 14 (App Router) + Supabase + Stripe + Resend, deployed on Vercel.

- `npm run verify` — the full gate: typecheck, then tests, then a production
  build. Run this before any deploy. `TESTING.md` explains what it does and
  does not cover, and carries the manual smoke-test process for the flows no
  test touches (payments, webhooks, bookings, email).
- `npm test` — Vitest suite in `__tests__/`
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — ESLint (`eslint-config-next`) via flat config. Advisory
  only: ~490 pre-existing findings, mostly `no-explicit-any`. Not `next lint`,
  which cannot read this repo's `eslint.config.mjs` and prompts interactively.
- `npm run build:check` — production build with placeholder secrets, so it
  works without a `.env.local`
- Database migrations live in `supabase/migrations/` and are applied by hand
  in the Supabase SQL editor.
- Scheduled jobs are Vercel Cron entries in `vercel.json`, implemented under
  `app/api/cron/`, and authenticated with a `CRON_SECRET` bearer token.

## Business facts have one source — `lib/seo/`

`lib/seo/business.ts` (address, phone, plans, prices, amenities, policies) and
`lib/seo/faqs.ts` (every question and answer) are the canonical copy of every
public fact about the business. Hours are the one thing they do **not** own:
those live in `lib/hours.ts`, which the portal and booking routes already read,
and `lib/seo/` quotes from it rather than keeping a second copy. The JSON-LD in
`components/LocalBusinessSchema.tsx` and `components/seo/*`, the `/llms.txt` and
`/llms-full.txt` routes, the homepage facts block and the FAQ page all render
from them.

Change a price or an hour **there**, not in the page that displays it. Search
engines and AI assistants cross-check the visible page against the structured
data against the plain-text file; when those disagree, they hedge or quote a
competitor instead. `__tests__/seo-facts.test.ts` guards the parts of that
agreement a machine can check.

FAQ answers are plain text on purpose: the same string is the page copy, the
`acceptedAnswer` in FAQPage markup, and a section of `/llms-full.txt`. Write
each one so it is still true and useful quoted on its own, with no page around
it.

`AI_SEARCH.md` explains the whole approach, and lists the off-site work
(Google Business Profile, reviews, directories) that code cannot do.

## Supabase keep-alive — do not remove

`app/api/cron/supabase-keep-alive` runs **daily** and issues one `head: true`
count against `members` (`lib/portal/keepAlive.ts`). It looks like it does
nothing. It is load-bearing.

Supabase pauses Free-plan projects after ~7 consecutive days with no database
activity. Restoring a paused project is a manual click in the Supabase
dashboard that the app cannot trigger, so if it ever happens the portal,
bookings, and snack shop stay down until a human notices. This site regularly
goes a week without traffic that reaches the database, so the scheduled read is
what keeps the timer from ever getting close.

Rules for anyone touching it:

- **Do not delete it** as dead code, and do not fold it into another job.
- **Do not make it weekly.** Daily leaves ~6 days of slack, so several failed
  runs in a row still cannot cost us the project.
- **Do not replace the read with a write.** Creating and deleting a throwaway
  record in a real business table buys no extra protection — Supabase's timer
  only cares that the database was queried — while it does ripple through every
  downstream consumer of that table and leaves an orphaned row behind if the
  delete step fails.
- **The read is the verdict.** The `cron_runs` audit row is best effort; a
  failure there must never make a healthy database look down.
- Failure is loud on purpose: non-2xx (red in Vercel's cron dashboard) plus a
  staff email with the restore steps, deduped per UTC day.

This is only necessary because the project is on the Supabase Free plan. Paid
projects are never auto-paused — if the project is ever upgraded to Pro, this
job becomes optional and can be retired deliberately (not "cleaned up").

## A submitted application is never unwound

`/api/membership-application/trial` writes a `member_applications` row and
then does three more things — uploads the photo ID, emails the applicant,
emails staff. **None of them may take the row back down**, and nothing in
that route may return an error to someone whose submission was valid.

The reasoning is not symmetric with a normal write path. A trial-day
application is a person who has told us they are coming to the building on a
named day, and `/admin/applications` is the only place staff see that. When
the row disappears, nobody knows to expect them — there is no retry, no
queue, no second copy. Everything else in the request is recoverable by a
human:

- **Photo ID failed to upload.** The row stays and is flagged
  (`payload.id_upload_failed`); the admin card says so and the staff email
  says to check the ID at the door, where staff are standing in front of the
  person anyway. This route used to delete the application here.
- **The insert itself failed.** The staff email still goes out, subject
  `🚨 TRIAL DAY NOT SAVED`, and says it is now the only record.
- **A migration is missing.** The insert walks down a ladder, dropping the
  columns that database does not have yet; everything it drops is mirrored
  in `payload`, which the admin panel and the prefill reader both read.

`__tests__/trial-application-route.test.ts` holds all of this, with a fake
Supabase that rejects unknown columns the way PostgREST does.
`npm run diagnose:trial` (see `TESTING.md`) checks the same path against the
live database.

## Café membership — the cap lives in code

`cafe_membership` ($100/mo, `lib/portal/pricing.ts`) is open seating on the café
side of the flex space. It has no desk, so none of `deskAvailability.ts` applies
to it; capacity is a headcount in `lib/portal/cafeAvailability.ts` against
`CAFE_MEMBER_LIMIT` (15).

That limit is deliberately **not** a database constraint. It is a product
decision that moves with the café's seating, and enforcing it in SQL would need
a row-counting trigger and would stop an admin ever making a sixteenth exception
by hand. So `computeCafeCapacity` never reports negative headroom — being over
the cap is a supported state, not a bug.

Its allowance is half a dedicated desk's, by design: 2 conference hours a month
against 4, and 2 flex hours a week against 4. Half the price, half the credit.
If the desk numbers change, change these with them — `__tests__/cafe-membership.test.ts`
asserts the halving rather than the literals.

## The flex space availability endpoint is public on purpose

`app/api/flex-bookings/availability` takes **optional** auth. It is the only
portal-adjacent endpoint that does, and that is deliberate — do not "fix" it by
putting `requireMember` back.

The calendar it feeds lives on `/member-resources/flex-space`, which is a
marketing page. The two people most likely to ask "is the hall free on
Thursday" are a prospect deciding whether the room is worth joining for, and
someone weighing an event booking; both used to find a sign-in wall where the
calendar should have been. The response is time ranges and nothing else — no
name, email, member id or event title — so there is nothing behind that wall to
protect. A valid token changes exactly one thing: the caller's own bookings come
back flagged `is_self` so the grid can colour them. A bad or missing token is
the normal case, not an error.

Anonymous callers are rate limited per IP (`lib/rateLimit.ts`); signed-in
members are exempt, being already identified.

Related: `components/portal/FlexCalendar.tsx` must build each day column from
`FLEX_OPEN_MINUTES`/`FLEX_CLOSE_MINUTES`, never from literal hours. It once used
9:00–4:30 while the grid it drew into ran 8:00–4:00, which silently dropped
every booking in the first hour of the day and misplaced the rest.
`__tests__/flex-calendar-window.test.ts` holds that line.

## The membership comparison table only shows differences

`/membership` splits its side-by-side into two things:

- `COMPARE_ROWS` — facts that actually differ between tiers.
- `EVERY_TIER` — facts every membership shares, printed once under the table.

A row whose five cells all say the same thing compares nothing; it costs a line
of scroll and a line of attention to tell the reader something the note already
told them. So when a row becomes uniform across all five columns, move it down;
when a note item stops being universal, move it back up.
`__tests__/membership-compare.test.ts` fails the build either way.

Lockable storage lives in the note because café members get a locker too. That
is recent — the FAQ answers and `lib/seo/business.ts` were updated with it, so
check those together if it ever changes back. Monitors, by contrast, are a
**desk-tier** amenity: dedicated desks and private dedicated desks only, not
offices and not café.

## Day passes are retired, not deleted

`one_day_dedicated_desk` is no longer sold. Nothing a prospective member can
reach offers one, and `PLAN_CATALOG` in `app/api/membership-application/route.ts`
omits it so a stale form can't buy one.

Everything behind that stays: the designation, the `day_passes` table, the
repeat-purchase route at `app/api/portal/day-pass`, the Stripe webhook branch,
and the per-day conference allotment in `lib/bookings/conference-hours.ts`.
Existing pass holders still carry the designation and the table still references
those members, so dropping any of it would orphan live rows. Do not "clean it
up" — it is retired inventory, not dead code.
