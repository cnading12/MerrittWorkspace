-- Adds trial-day tracking to member applications. Applicants who tick the
-- trial-day checkbox get an immediate practical-info email and are flagged
-- in the admin panel so they can be prioritised. They still go through the
-- standard onboarding flow if/when they convert to full membership.

alter table public.member_applications
  add column if not exists wants_trial_day boolean not null default false,
  add column if not exists trial_date date;

create index if not exists member_applications_wants_trial_day_idx
  on public.member_applications (wants_trial_day)
  where wants_trial_day = true;
