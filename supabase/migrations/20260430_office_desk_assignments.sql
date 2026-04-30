-- Office and dedicated desk assignments for members. Stored as text so
-- assignments can carry letter suffixes (e.g. "12B") or non-numeric desk
-- labels. Both columns are optional and independent: a private office
-- member typically has office_number set, a dedicated desk member has
-- desk_number set, and flex/trial members may have neither.

alter table public.members
  add column if not exists office_number text,
  add column if not exists desk_number text;

create index if not exists members_office_number_idx on public.members(office_number);
create index if not exists members_desk_number_idx on public.members(desk_number);
