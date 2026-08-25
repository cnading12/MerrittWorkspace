-- ============================================================
-- cafe_membership: a seat on the cafe side of the flex space, $100/month.
--
-- Added because the shared coworking floor is effectively sold out. Every
-- other tier we sell needs a desk to exist; this one does not, which is what
-- makes it the tier we can still take money for.
--
-- What it is: open seating in the cafe of the 1905 building next door. No
-- assigned desk, no claim on a DD number, no office. Full run of the
-- amenities — coffee, tea and beer, printing, WiFi, free parking — and half a
-- dedicated desk's booking allowance (2 flex hours a week against 4, and 2
-- conference hours a month against 4).
--
-- Capacity is capped at 15 in application code (CAFE_MEMBER_LIMIT in
-- lib/portal/cafeAvailability.ts), NOT here. That is deliberate: the cap is a
-- product decision that staff may want to move with the seating, and a CHECK
-- constraint counting rows would need a trigger and would block an admin from
-- ever making a sixteenth exception by hand.
--
-- Note what this migration does NOT do: it does not remove
-- 'one_day_dedicated_desk'. Day passes are no longer sold, but existing pass
-- holders still carry that designation and the day_passes table still
-- references those members. Dropping it from the CHECK would orphan live rows.
-- ============================================================

alter table public.members
  drop constraint if exists members_designation_check;

alter table public.members
  add constraint members_designation_check
  check (designation in (
    'dedicated_desk',
    'cafe_membership',
    -- Retired: no longer sold, retained so existing pass holders stay valid.
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
  'office_member = non-paying occupant of a private office someone else pays for; linked to the office via office_number. private_dedicated_desk = paying dedicated-desk member seated in a private office converted into a dedicated-desk area, also linked via office_number. cafe_membership = open seating on the cafe side of the flex space, no assigned desk, capped at 15 in application code. community_partner = comped non-profit access, never pooled, hours set per member via the override columns. one_day_dedicated_desk = RETIRED day pass, no longer sold, kept for existing holders.';


-- ------------------------------------------------------------
-- tier_allocations: allow and seed the new designation.
-- ------------------------------------------------------------
alter table public.tier_allocations
  drop constraint if exists tier_allocations_designation_check;

alter table public.tier_allocations
  add constraint tier_allocations_designation_check
  check (designation in (
    'dedicated_desk',
    'cafe_membership',
    'private_dedicated_desk',
    'one_day_dedicated_desk',
    'private_office_single',
    'private_office_double',
    'private_office_large',
    'office_member',
    'community_partner'
  ));

-- Half a dedicated desk's allowance, matching the half-price positioning.
-- Mirrors FALLBACK_ALLOCATIONS in lib/bookings/allocations.ts — change both.
insert into public.tier_allocations
  (designation, flex_hours_per_week, conference_hours_per_month, notes)
values
  ('cafe_membership', 2, 2, 'Cafe-side open seating, $100/mo. Half a dedicated desk''s allowance by design. Capped at 15 members in application code.')
on conflict (designation) do update set
  flex_hours_per_week        = excluded.flex_hours_per_week,
  conference_hours_per_month = excluded.conference_hours_per_month,
  notes                      = excluded.notes;

-- Record that the day pass is retired without deleting its row: the allowance
-- still has to resolve for members who hold one.
update public.tier_allocations
   set notes = 'RETIRED — day passes are no longer sold. Row retained because existing holders still resolve their allowance through it. Conference time on pass days comes from DAY_PASS_INCLUDED_HOURS_PER_DAY, not this row.'
 where designation = 'one_day_dedicated_desk';
