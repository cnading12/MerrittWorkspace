# Notes for future sessions

Next.js 14 (App Router) + Supabase + Stripe + Resend, deployed on Vercel.

- `npm test` — Vitest suite in `__tests__/`
- `npm run lint` — ESLint (`eslint-config-next`)
- Database migrations live in `supabase/migrations/` and are applied by hand
  in the Supabase SQL editor.
- Scheduled jobs are Vercel Cron entries in `vercel.json`, implemented under
  `app/api/cron/`, and authenticated with a `CRON_SECRET` bearer token.

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
