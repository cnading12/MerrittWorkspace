-- Manual seating assignments for the admin seating chart.
--
-- The admin seating chart shows who sits at every desk (DD1–DD25) and office
-- (100–112, 114, 120). The primary source is the members table itself
-- (members.desk_number / members.office_number), which already exists. This
-- table is the SECOND source: people who have not yet transitioned to the
-- portal but still occupy a seat, entered manually by an admin.
--
-- One row = one occupant of one space. Name only (no company/notes for now),
-- matching the existing text-based assignment columns on members. This is
-- purely additive — it does not touch the members table or any existing data.

create table if not exists public.seating_manual_assignments (
  id uuid primary key default gen_random_uuid(),
  -- 'desk' or 'office'. Mirrors how members.desk_number / members.office_number
  -- split the two kinds of space.
  space_type text not null check (space_type in ('desk', 'office')),
  -- Canonical space label, e.g. "DD4" for desks or "101" for offices. Stored
  -- as text to match the members.* assignment columns and to allow office
  -- numbers like "120".
  space_number text not null,
  -- The person sitting here. Name only by design.
  occupant_name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one manual entry per space. Case-insensitive so "dd4" and "DD4" can't
-- both exist. A manual entry that collides with a PORTAL member is intentionally
-- NOT prevented here — that cross-source clash is surfaced in the UI as a
-- conflict so the admin can resolve it, rather than being silently blocked.
create unique index if not exists seating_manual_assignments_space_uniq
  on public.seating_manual_assignments (space_type, lower(space_number));

create index if not exists seating_manual_assignments_type_idx
  on public.seating_manual_assignments (space_type);

-- Keep updated_at fresh on every change, reusing the shared trigger function
-- defined in the onboarding-portal migration.
drop trigger if exists seating_manual_assignments_updated_at
  on public.seating_manual_assignments;
create trigger seating_manual_assignments_updated_at
  before update on public.seating_manual_assignments
  for each row execute function public.set_updated_at();

-- Row Level Security: admin-only, mirroring the other admin-managed tables.
-- Writes happen through the service-role key in the admin API routes, but the
-- policy keeps the table locked down for any anon/authenticated access too.
alter table public.seating_manual_assignments enable row level security;

drop policy if exists seating_manual_admin_all on public.seating_manual_assignments;
create policy seating_manual_admin_all on public.seating_manual_assignments
  for all using (public.is_admin()) with check (public.is_admin());
