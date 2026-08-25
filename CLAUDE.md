# Notes for future sessions

Next.js 14 (App Router) + Supabase + Stripe + Resend, deployed on Vercel.

- `npm test` — Vitest suite in `__tests__/`
- `npm run lint` — ESLint (`eslint-config-next`)
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
