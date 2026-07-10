-- Day passes for 'one_day_dedicated_desk' members.
--
-- One row per purchased single-day pass, date-stamped so we know which day
-- the member is coming in. The first pass is created by the initial
-- onboarding payment; additional passes are bought from the portal without
-- re-applying (see app/api/portal/day-pass). Conference-room hours for
-- day-pass members key off this table: 1 included hour on days the member
-- holds a confirmed pass, none otherwise.

create table if not exists public.day_passes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  pass_date date not null,
  amount_cents integer not null default 3000,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text unique,
  status text not null default 'confirmed'
    check (status in ('confirmed','refunded')),
  created_at timestamptz not null default now(),
  -- A member holds at most one pass per calendar day.
  unique(member_id, pass_date)
);

create index if not exists day_passes_member_idx on public.day_passes(member_id);
create index if not exists day_passes_date_idx on public.day_passes(pass_date);

alter table public.day_passes enable row level security;

-- Members can read their own passes; admins can do everything. Writes happen
-- via the service role from the Stripe webhook.
drop policy if exists day_passes_self_select on public.day_passes;
create policy day_passes_self_select on public.day_passes
  for select using (
    member_id in (select id from public.members where user_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists day_passes_admin_all on public.day_passes;
create policy day_passes_admin_all on public.day_passes
  for all using (public.is_admin()) with check (public.is_admin());
