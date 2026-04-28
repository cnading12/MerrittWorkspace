-- Flex space bookings: members can reserve the church building (the "flex
-- space") for up to 4 hours per week at no additional cost. Bookings are
-- stored here as the source of truth for weekly-hours math; the actual
-- calendar event lives on the Flex Space Bookings Google Calendar.

create table if not exists public.flex_bookings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  duration_minutes integer not null
    generated always as (
      ceil(extract(epoch from (end_time - start_time)) / 60)::int
    ) stored,
  google_event_id text,
  status text not null default 'pending'
    check (status in ('pending','confirmed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (end_time > start_time)
);

create index if not exists flex_bookings_member_start_idx
  on public.flex_bookings(member_id, start_time);

drop trigger if exists flex_bookings_updated_at on public.flex_bookings;
create trigger flex_bookings_updated_at before update on public.flex_bookings
  for each row execute function public.set_updated_at();

alter table public.flex_bookings enable row level security;

-- A member can read and cancel their own bookings; admins see everything.
-- Inserts go through the service role from the API route, so no insert
-- policy is needed for end users.
drop policy if exists flex_bookings_self_select on public.flex_bookings;
create policy flex_bookings_self_select on public.flex_bookings
  for select using (
    member_id in (select id from public.members where user_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists flex_bookings_admin_all on public.flex_bookings;
create policy flex_bookings_admin_all on public.flex_bookings
  for all using (public.is_admin()) with check (public.is_admin());
