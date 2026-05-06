-- Existing-member migration support.
--
-- Adds an `is_legacy_member` flag to `members` so we can distinguish members
-- who came in through the public "Already a member?" migration form (i.e.
-- folks who originally signed up on paper and were billed manually by the
-- accountant) from members who came through the standard new-applicant flow.
--
-- A legacy member:
--   • is auto-approved on submission (no admin review)
--   • does not have to upload Photo ID / Proof of Address
--   • does not have to set up Stripe auto-pay (they may continue paying via
--     whatever arrangement they had with the accountant)
--   • still signs the standard Member Agreement, T&C, and Fee Agreement
--   • appears on the admin members list with a "Legacy" tag
--
-- We also tag the corresponding `member_applications` row with
-- `is_existing_member = true` so admins can see, filter, and audit those
-- submissions even though they bypass the pending-applications queue.

alter table public.members
  add column if not exists is_legacy_member boolean not null default false;

create index if not exists members_is_legacy_member_idx
  on public.members(is_legacy_member);

alter table public.member_applications
  add column if not exists is_existing_member boolean not null default false;

create index if not exists member_applications_is_existing_member_idx
  on public.member_applications(is_existing_member);
