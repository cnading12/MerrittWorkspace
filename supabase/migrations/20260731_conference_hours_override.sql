-- Per-member conference-hours override.
--
-- Free conference-room hours normally come from the membership designation
-- (dedicated desk 4, private offices 8/12/20, everything else 0 — see
-- lib/bookings/conference-hours.ts). A few special-case people don't fit any
-- designation: e.g. approved non-members who were given a portal account so
-- they can book the conference room. Rather than inventing a designation for
-- a handful of accounts, admins can set an explicit monthly allotment on the
-- individual member.
--
--   NULL  → normal designation-based hours (the default for everyone)
--   N ≥ 0 → this member gets exactly N free hours per calendar month,
--           regardless of designation. Overrides the day-pass daily allotment
--           and office pooling too — it is a personal monthly allotment.
--
-- Set from the admin members page ("Free conf hrs/mo" field).

alter table public.members
  add column if not exists conference_hours_override integer
  check (conference_hours_override is null or conference_hours_override >= 0);

comment on column public.members.conference_hours_override is
  'Admin-set monthly free conference-room hours for this member. NULL = use designation-based allotment. Used for special cases (e.g. approved non-members) without creating a new designation.';
