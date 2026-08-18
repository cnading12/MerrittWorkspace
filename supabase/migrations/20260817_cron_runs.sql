-- Audit trail for scheduled jobs (Vercel Cron). Written best-effort by the
-- job itself, so a missing table or a failed insert never changes what the
-- job reports — it only costs us the receipt.
--
-- First consumer: /api/cron/supabase-keep-alive, the daily read that stops
-- Supabase from pausing this Free-plan project after 7 quiet days. Vercel's
-- cron dashboard only keeps recent invocations, so these rows are how we
-- prove weeks later that the keep-alive was actually running.

create table if not exists public.cron_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null,
  ok boolean not null,
  detail text,
  ran_at timestamptz not null default now()
);

create index if not exists cron_runs_job_ran_at_idx
  on public.cron_runs (job, ran_at desc);

alter table public.cron_runs enable row level security;

-- Service role (the cron routes) is the only writer; only admins may read.
-- Members never see these rows.
drop policy if exists cron_runs_admin_all on public.cron_runs;
create policy cron_runs_admin_all
  on public.cron_runs
  for all using (public.is_admin()) with check (public.is_admin());
