-- ============================================================
-- tier_allocations: per-designation booking allowances.
--
-- Flex-space and conference-room allowances used to be hardcoded:
-- conference hours in INCLUDED_MONTHLY_HOURS (lib/bookings/conference-hours.ts)
-- and a single uniform 4 hr/week flex cap (MAX_WEEKLY_MINUTES in
-- app/api/flex-bookings/route.ts). Both now live here so the numbers can be
-- changed with an UPDATE instead of a deploy.
--
-- One row per membership designation. Read server-side only; the TS constants
-- remain as a fallback so a database hiccup degrades to today's numbers
-- rather than to zero. There is no admin UI — edit these rows in the Supabase
-- SQL editor.
--
-- Reset cadence is NOT stored here because it is policy, not configuration:
-- flex resets Monday 00:00 MT (lib/bookings/weekly-hours.ts) and conference
-- resets the 1st of the month MT (lib/bookings/conference-hours.ts). Neither
-- rolls over. There is no max-advance-days column: advance limits were cut
-- deliberately, and same-day booking stays available on both resources.
--
-- Hours here are the ALLOWANCE ONLY. A member who is out of allowance can
-- still book at the overage rate ($25/hr conference, $75/hr flex), which is
-- rate configuration in code, not per-tier data.
--
-- Both resources pool per office: an office's allowance is the highest
-- allowance among its occupants, and every occupant's bookings draw from it.
-- See lib/bookings/conference-hours.ts.
-- ============================================================
create table if not exists public.tier_allocations (
  -- Matches members.designation. Not a foreign key: designations are a CHECK
  -- constraint on members, not a lookup table. The check below mirrors that
  -- list so a typo in a hand-written UPDATE fails loudly instead of silently
  -- creating a row nothing will ever read.
  designation text primary key
    check (designation in (
      'dedicated_desk',
      'private_dedicated_desk',
      'one_day_dedicated_desk',
      'private_office_single',
      'private_office_double',
      'private_office_large',
      'office_member',
      'community_partner'
    )),

  -- Flex space (the 1905 church next door), hours per Mountain-Time week.
  flex_hours_per_week numeric(4,1) not null default 0
    check (flex_hours_per_week >= 0),

  -- Conference room, hours per Mountain-Time calendar month. Only counts
  -- against hours booked inside peak (weekdays 8:00 AM – 6:00 PM MT);
  -- off-peak hours are unlimited and free for every tier.
  conference_hours_per_month numeric(4,1) not null default 0
    check (conference_hours_per_month >= 0),

  -- Free-text reminder of why a row holds the numbers it does. Optional.
  notes text,

  updated_at timestamptz not null default now()
);

comment on table public.tier_allocations is
  'Per-designation flex and conference allowances. Edited by hand in the SQL editor; read server-side with the TS constants in lib/bookings/ as fallback.';

-- Keep updated_at fresh, reusing the shared trigger function defined in the
-- onboarding-portal migration.
drop trigger if exists tier_allocations_updated_at on public.tier_allocations;
create trigger tier_allocations_updated_at
  before update on public.tier_allocations
  for each row execute function public.set_updated_at();

-- ============================================================
-- Seed. `on conflict do update` so re-running this migration re-asserts the
-- intended numbers rather than silently skipping.
-- ============================================================
insert into public.tier_allocations
  (designation, flex_hours_per_week, conference_hours_per_month, notes)
values
  ('dedicated_desk',         4,  4,  'Shared coworking floor, $200/mo.'),
  ('private_office_single',  6, 14,  'Small office. Identical to double by design — never differentiate them in UI or logic.'),
  ('private_office_double',  6, 14,  'Small office. Identical to single by design — never differentiate them in UI or logic.'),
  ('private_office_large',   8, 20,  'Large office. The only tier where per-office pooling has real effect.'),
  ('one_day_dedicated_desk', 0,  0,  'Day pass: no flex access at all; conference is 1 hr on pass days via DAY_PASS_INCLUDED_HOURS_PER_DAY, not this row.'),
  ('office_member',          6, 14,  'PROVISIONAL — does not map to a product we sell. Small-office values so the two live accounts keep working; to be remapped.'),
  -- Preserves today's behavior for a product the site starts selling
  -- automatically once all 25 shared desks are claimed (see
  -- lib/portal/deskAvailability.ts and the sold-out notice on
  -- /membership/dedicated-desk). Zero holders today. Delete this row if you
  -- want private-desk members to get no allowance at all.
  ('private_dedicated_desk', 4,  4,  'Same as dedicated_desk: same product in a private room, $300/mo.'),
  -- Zero by design: a community partner''s hours are set per member by an
  -- admin (members.flex_hours_override / conference_hours_override), because
  -- each arrangement is negotiated individually. This row exists so the
  -- designation resolves to a defined allowance rather than an unknown one.
  ('community_partner',      0,  0,  'Comped access for non-profits. Hours are set per member via the admin overrides, not here.')
on conflict (designation) do update set
  flex_hours_per_week        = excluded.flex_hours_per_week,
  conference_hours_per_month = excluded.conference_hours_per_month,
  notes                      = excluded.notes;

-- ============================================================
-- Row Level Security: admin-only, mirroring seating_manual_assignments.
-- The booking routes read this through the service-role key, which bypasses
-- RLS, so members never query it directly.
-- ============================================================
alter table public.tier_allocations enable row level security;

drop policy if exists tier_allocations_admin_all on public.tier_allocations;
create policy tier_allocations_admin_all on public.tier_allocations
  for all using (public.is_admin()) with check (public.is_admin());


-- ============================================================
-- community_partner: comped facility access for non-profit organisations.
--
-- These are not members and not office occupants — they are organisations
-- granted use of the conference room and flex space at no charge. They were
-- previously carried as 'office_member', which is the wrong home: that
-- designation means an occupant of an office someone else pays for, and its
-- allowance POOLS per office. A partner that ever had an office_number set
-- would silently start drawing down a paying member's hours.
--
-- Their allowance is deliberately NOT unlimited and NOT a tier default. Each
-- arrangement is negotiated individually, so the hours are set per member by
-- an admin through the two override columns below. The tier_allocations row
-- above is 0/0, so a partner with no override set gets nothing included and
-- pays the standard overage rate — a safe default rather than a free-for-all.
-- ============================================================
alter table public.members
  drop constraint if exists members_designation_check;

alter table public.members
  add constraint members_designation_check
  check (designation in (
    'dedicated_desk',
    'one_day_dedicated_desk',
    'private_dedicated_desk',
    'private_office_single',
    'private_office_double',
    'private_office_large',
    'office_member',
    'community_partner',
    'flex',
    'other'
  ));

comment on constraint members_designation_check on public.members is
  'office_member = non-paying occupant of a private office someone else pays for; linked to the office via office_number. private_dedicated_desk = paying dedicated-desk member seated in a private office converted into a dedicated-desk area, also linked via office_number. community_partner = comped non-profit access, never pooled, hours set per member via the override columns.';

-- Weekly flex-space override, mirroring the existing monthly conference one.
--
--   NULL  → use the designation's tier_allocations allowance (the default)
--   N ≥ 0 → this member gets exactly N flex hours per week, personally,
--           regardless of designation or office pooling.
--
-- Fractional because flex bookings are made in half-hour steps.
alter table public.members
  add column if not exists flex_hours_override numeric(4,1)
  check (flex_hours_override is null or flex_hours_override >= 0);

comment on column public.members.flex_hours_override is
  'Admin-set weekly flex-space hours for this member. NULL = use the designation allowance from tier_allocations. Set for community partners, whose access is negotiated individually.';
