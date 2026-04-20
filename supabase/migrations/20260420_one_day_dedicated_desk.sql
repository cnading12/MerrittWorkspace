-- Add the 'one_day_dedicated_desk' designation for members buying a
-- single-day pass at $30. Follows the same onboarding flow as a recurring
-- dedicated desk membership, but is billed as a one-time charge instead
-- of a monthly subscription.

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
    'flex',
    'other'
  ));
