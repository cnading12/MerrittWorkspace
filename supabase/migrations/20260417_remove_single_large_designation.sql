-- Remove the 'private_office_single_large' designation ($600/mo tier).
-- We now only offer single-desk offices at $500/mo and two-desk offices at
-- $700/mo. Any existing members on the discontinued tier are migrated to
-- 'private_office_single' before the constraint is re-tightened.

update public.members
  set designation = 'private_office_single'
  where designation = 'private_office_single_large';

alter table public.members
  drop constraint if exists members_designation_check;

alter table public.members
  add constraint members_designation_check
  check (designation in (
    'dedicated_desk',
    'private_office_single',
    'private_office_double',
    'private_office_large',
    'flex',
    'other'
  ));
