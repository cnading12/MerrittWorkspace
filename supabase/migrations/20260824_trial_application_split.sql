-- ============================================================
-- Trial-day applications split off from full membership applications.
--
-- Before this migration a trial day and a membership application were the
-- same 40-field form, distinguished only by the `wants_trial_day` boolean.
-- Trial applicants were handing over a mortgage company and a gym contact
-- to come sit at a desk for one day — data that was written to `payload`
-- and never read, because the trial-day email fires immediately on submit
-- and no approve/decline ever gates it.
--
-- Now the two paths collect different things:
--   • trial  — contact details, which seating they want to try, a date, and
--              a photo ID. Nothing else.
--   • full   — unchanged: plans, references, emergency contact, the lot.
--
-- The columns below carry a trial applicant forward into a full application
-- without asking them for anything twice.
-- ============================================================

-- Which form produced this row. Existing rows are all full applications;
-- `wants_trial_day = true` on one of those means "full applicant who also
-- asked for a trial day", which stays a legitimate combination.
alter table public.member_applications
  add column if not exists application_kind text not null default 'full';

do $$
begin
  alter table public.member_applications
    add constraint member_applications_application_kind_check
    check (application_kind in ('trial', 'full'));
exception
  when duplicate_object then null;
end $$;

-- Unguessable token behind the "finish your membership application" link we
-- email after a trial day. Deliberately NOT the row id: the id shows up in
-- staff emails and admin URLs, and this token is a bearer credential that
-- prefills someone's name, phone, and photo ID.
alter table public.member_applications
  add column if not exists resume_token text;

create unique index if not exists member_applications_resume_token_idx
  on public.member_applications (resume_token)
  where resume_token is not null;

-- Storage path of the photo ID attached at trial-application time, in the
-- private `member-documents` bucket under
-- trial-applications/<application_id>/photo_id-<ts>.<ext>.
--
-- Same prefix trick as guest bookings (20260731_guest_booking_photo_id.sql):
-- `trial-applications` can never equal a members.id UUID, so the member
-- self-read storage policies in 20260406_storage_rls_policies.sql cannot
-- match it. Only service-role calls and admins reach these files.
--
-- Null for full applications, which collect the photo ID in the portal after
-- approval instead.
alter table public.member_applications
  add column if not exists id_document_path text;

-- When the post-trial "come finish your application" email went out. Set
-- once and then checked, so a cron that runs every day cannot nag someone
-- every day.
alter table public.member_applications
  add column if not exists conversion_email_sent_at timestamptz;

-- Set on the TRIAL row once that person submits a full application, pointing
-- at the full row. Gives staff the audit trail (this member came in via a
-- trial on this date) and stops the follow-up cron re-mailing someone who
-- already converted.
alter table public.member_applications
  add column if not exists converted_to_application_id uuid
    references public.member_applications(id) on delete set null;

-- Drives the follow-up cron: trial rows whose day has passed, that have not
-- been emailed and have not converted. Narrow partial index because that is
-- a tiny slice of the table.
create index if not exists member_applications_trial_followup_idx
  on public.member_applications (trial_date)
  where application_kind = 'trial'
    and conversion_email_sent_at is null
    and converted_to_application_id is null;

-- Drives the admin queue split — pending full applications awaiting a
-- decision, without trial rows mixed in.
create index if not exists member_applications_kind_status_idx
  on public.member_applications (application_kind, status);
