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

## Every admin read defeats the cache twice

Admin API responses were once served from the browser's HTTP cache — a
snapshot of the queue or the roster recorded hours earlier. The symptom is
maddening and always reads as something else: a newly approved member "not
showing up on the Members page at all" while their row sits in the database,
an approved or dismissed card that never leaves the queue, buttons that
"do nothing" because the write landed and the re-read replayed the past.

So every admin GET does both of these, and any new admin page must too:

- `cache: 'no-store'` on the fetch, which makes the browser skip its cache;
- a `t=${Date.now()}` query param, so the URL is unique and cannot be
  answered by any cache anywhere — including an entry recorded before the
  `no-store` response headers (next.config.js applies them to all of
  `/api/*`) ever deployed, and any intermediary that ignores headers.

And when a load fails, only 401/403 may bounce to the sign-in page.
Everything else renders as an on-page error — `router.replace('/admin')` on
a 500 looks like a logout, and a failing query that looks like a logout is
how a broken page stays broken quietly. The applications page and the
members page each learned this separately.

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

## A full application says whether it saved

`/api/membership-application` is the other end of the same promise, and it
used to make a weaker one. The insert was best effort: a failure was logged
to a console nobody reads, the applicant got "Application Submitted!", staff
got `🆕 New Membership Application`, and the admin queue had nothing in it.
Nobody involved could tell.

So the write is now the verdict, and everything after it reports on it:

- The insert walks a **three-rung ladder** using the shared
  `isMissingColumnError`, the mirror of the trial route's. Rung 1 writes the
  20260824 columns, rung 2 drops them, rung 3 drops 20260428's as well;
  everything dropped is mirrored in `payload`, including `application_kind`.
  The old single retry dropped all three trial columns on a hand-rolled
  regex and lost the whole application on a database two migrations behind.
- If no rung lands, the staff email goes out as **`🚨 APPLICATION NOT SAVED`**
  and says it is the only record — the same contract the trial route has.
- The response carries `saved`, and `application_id` is the **database row
  id**, not the `APP-<timestamp>` reference. That id is what staff can
  actually find in the panel; the timestamp matched nothing anywhere.
- `resume_token` is kept out of `payload`. It is a bearer credential that
  prefills someone's details, and the admin detail view prints payload.

`__tests__/membership-application-route.test.ts` holds all of it, with the
same strict fake Supabase the trial route's tests use.

## A trial day that converts is visible from both ends

A trial visitor who comes back and finishes the full application is the case
that looks most like a lost application: the new row is a **membership
application**, so it lands in the second tab, while the trial card staff last
saw that person on sits unchanged in the first — still offering "Send
membership application".

Both rows now say what happened, and the resume-token lookup happens
**before** the insert so the new row carries it from the moment it exists:

- The trial row gets `converted_to_application_id`. Its card shows
  **APPLIED FOR MEMBERSHIP**, points at the other tab, and drops the send
  button.
- The full row gets `payload.converted_from_trial` (`{ application_id,
  trial_date }`) and the photo ID from the trial day. Its card says which
  trial day it came from.
- The staff email says the same thing in its own banner.

`readConvertedApplicationId` and `readTrialOrigin` in
`lib/portal/trialApplication.ts` are the readers, both falling back to
`payload` like everything else in that file. `npm run diagnose:trial` lists
converted trials and flags a pending application whose trial row was never
linked.

## The admin queue is two queues

`/admin/applications` has two tabs, and they are two different reads
(`app/api/admin/applications/route.ts`, split by
`lib/portal/applicationQueue.ts`):

- **Trial days** — visits to expect. Selected on being a trial row at all
  (`application_kind = 'trial'`, or `wants_trial_day` for legacy rows from
  the old combined form), **never on `status`**. Rows whose status is
  explicitly `approved` or `declined` are dropped afterwards, in JS.
- **Membership applications** — decisions to make. Also read **without a
  status filter** (a recent window, newest first), with explicitly handled
  rows — `approved`, `declined`, or carrying the dismissal marker — dropped
  afterwards in JS. It used to be `eq('status', 'pending')`, and that filter
  is how applications went missing: migrations here are applied by hand, so
  a live table whose status default or constraint has drifted writes rows
  that are not exactly `'pending'`, which the Documents page (no status
  filter) showed while this queue silently returned nothing.

Do not "simplify" this back into one query. A trial day is a person who has
told us they are coming to the building on a named day; the panel is the only
place staff see that, and there is no retry and no second copy. A membership
application that is briefly invisible gets approved a day later. A visit that
is briefly invisible is someone standing in reception that nobody expected.

So the trial read refuses to trust `status` to mean what we think it means: a
row with a null, empty or unrecognised status still shows. Being unable to
explain a status costs one click to dismiss; hiding on it costs the visit.
`__tests__/admin-applications-queue.test.ts` holds that, along with the read
ladder for a database behind on a migration — the mirror image of the insert
ladder in the trial route, and it shares that route's `isMissingColumnError`.

Dismiss (and Approve/Decline) verify their own write:
`app/api/admin/applications/[id]` selects the row back after updating it and
returns a real error when the update fails or matches nothing. After the two
dismissal writes it additionally re-reads the whole row and asks `isHandled`
— the same question the queue asks — and errors if the answer is not the one
the action was supposed to produce, so a write that "succeeds" without
persisting can never put a green banner over an unchanged queue. It used to
discard the result and answer `{ ok: true }` regardless, and the page took
that at its word and dropped the card — so a dismiss that never reached the
database looked identical to one that did, until the row came back on the
next load. The page now re-reads the queue after every decision instead of
editing its local copy. Dismissed trial rows can be restored from the panel
(`action: 'restore'`): dismissing a visit is one click away from viewing it,
and this screen exists to stop visits going missing.

The endpoint also returns `diagnostics`, which the page prints under the
queue: how many trial rows exist, how many are already handled, and which
rung of the ladder answered. An empty queue has three different meanings and
staff cannot tell them apart from the word "none". For the same reason the
page only bounces to the sign-in screen on 401/403 — any other failure is
shown as an error, because a failing query that looks like a logout is how a
broken queue stays broken quietly.

Two rules for that block, both learned from it being wrong. **Every hidden
row is listed before any visible one**, because the row someone is asking
about is by definition one the tabs are not showing, and a plain
newest-N cut drops it first — the block tells the reader that an
application absent from the list was never saved, so a truncation that can
silently swallow the row makes the block lie. And **a hidden row says which
kind of hidden it is** (`explainHiddenRow`): approved, declined, dismissed,
or filed by the existing-member form, which inserts `status: 'approved'` on
submit so its rows never enter this queue at all. That last one is a real
way an application reaches `/admin/documents` and not `/admin/applications`,
and removing the status filter does not change it — it is by design, and the
panel has to be able to say so instead of leaving staff to conclude the
application was lost. A hidden row that no branch explains reports itself as
a bug rather than being folded into a reassuring summary.

## Every upload limit is one number, and it is below 4.5MB

`MAX_UPLOAD_BYTES` in `lib/portal/uploads.ts` is 4MB, and
`MAX_ID_FILE_BYTES` re-exports it. Four upload paths share it: portal
documents, the community-partner photo ID, the guest booking photo ID, and
the trial application.

It is a **request-body** limit, not a storage limit. Every one of those paths
posts multipart to a serverless function, and the platform drops a body over
4.5MB *before the route runs* — so a ceiling above that can never fire,
because the request it is meant to catch never arrives. What the person sees
instead is the raw `fetch` rejection: **"Load failed"** in Safari, "Failed to
fetch" in Chrome. Three words naming neither the cause nor the remedy.

That is exactly how it broke. The trial form worked this out and set 4MB; the
other three kept 10MB, in four separate literals, so a phone photo of a
licence — routinely 5–12MB — passed every check we wrote and died on the
platform's. Raising this number does not raise what the platform will carry.

Two things keep it working, and both belong on any new upload path:

- **Shrink in the browser first** (`prepareIdUpload` in
  `lib/portal/idUpload.ts`), then check the size of what comes back. It
  re-encodes an image until it fits and returns PDFs and undecodable files
  untouched, so the caller still has to check.
- **Never render a fetch rejection verbatim.** `describeUploadFailure` passes
  a real server message straight through and rewrites only the case with no
  response to read, naming the file's size when that is the likely cause.

`__tests__/security-hardening.test.ts` asserts the ceiling stays under 4.5MB
and that the four paths share one number;
`__tests__/upload-failure-message.test.ts` covers all three browsers' wording.

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
