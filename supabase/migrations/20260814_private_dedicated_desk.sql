-- Add the 'private_dedicated_desk' designation.
--
-- The building has 25 dedicated desks on the shared coworking floor
-- (DD1–DD26 without DD5). Once all 25 are spoken for — counting members who
-- have completed the onboarding portal and are paying, even if they haven't
-- picked a DD number yet — we stop selling floor-plan desks and convert empty
-- private offices into dedicated-desk areas instead. Those desks are sold at
-- $300/mo rather than $200/mo because the area is private and lockable.
--
-- A private dedicated desk member is seated by member services rather than
-- self-assigning, and their room is recorded in members.office_number (they
-- never hold a desk_number). On the admin seating chart they show inside their
-- office alongside any other private-desk members, with no office primary.
--
-- See lib/portal/deskAvailability.ts for the capacity rules and
-- lib/portal/pricing.ts for the rate.

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
    'flex',
    'other'
  ));

comment on constraint members_designation_check on public.members is
  'office_member = non-paying occupant of a private office someone else pays for; linked to the office via office_number. private_dedicated_desk = paying dedicated-desk member seated in a private office converted into a dedicated-desk area, also linked via office_number.';
