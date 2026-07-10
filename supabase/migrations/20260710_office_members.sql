-- Multi-occupant private offices.
--
-- Large private offices (e.g. office 110) can hold 1–6 people, but only one
-- person — the primary member — pays for the office. Everyone else in the
-- office is an "office member": a real portal account (so they can book the
-- conference room, order from the snack shop, request access codes, etc.)
-- with a $0 monthly cost, linked to the office through the same
-- members.office_number column the paying member uses.
--
-- No new relationship table is needed:
--   • The PRIMARY of office X  = the member with office_number = X and a
--     paying private_office_* designation.
--   • The OFFICE MEMBERS of X  = members with office_number = X and
--     designation = 'office_member'.
--
-- Office members sign up through the "existing member" flow, start with
-- status = 'pending', and are activated by an admin (one-click approval on
-- the admin members page). Conference-room included hours are pooled per
-- office: the office's allotment (from the primary's designation) is shared
-- by every occupant. See lib/bookings/conference-hours.ts.

alter table public.members
  drop constraint if exists members_designation_check;

alter table public.members
  add constraint members_designation_check
  check (designation in (
    'dedicated_desk',
    'one_day_dedicated_desk',
    'private_office_single',
    'private_office_double',
    'private_office_large',
    'office_member',
    'flex',
    'other'
  ));

comment on constraint members_designation_check on public.members is
  'office_member = non-paying occupant of a private office someone else pays for; linked to the office via office_number.';
