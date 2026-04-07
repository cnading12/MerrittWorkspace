-- Add the new 'private_office_single_large' designation ($600/mo tier)
-- and keep the existing dedicated_desk value (now used for the $100/mo
-- promo). Pricing itself lives in lib/portal/pricing.ts; this migration
-- only expands the allowed values on the members table.

alter table public.members
  drop constraint if exists members_designation_check;

alter table public.members
  add constraint members_designation_check
  check (designation in (
    'dedicated_desk',
    'private_office_single',
    'private_office_single_large',
    'private_office_double',
    'private_office_large',
    'flex',
    'other'
  ));
