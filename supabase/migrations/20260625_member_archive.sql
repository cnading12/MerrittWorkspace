-- Soft-archive for former members.
--
-- Members who completed onboarding/payment but later cancelled should be able
-- to be "removed" from the active roster WITHOUT destroying their data: their
-- documents, agreements, and payment history stay in the database and remain
-- recoverable, but they no longer count toward "total members" or clutter the
-- admin member list. This is distinct from the hard-delete path used for
-- never-paid trial signups (which removes the record entirely).
--
-- An archived member is simply one with archived_at set. All admin list/count
-- queries exclude archived members by default; an explicit "archived" view
-- surfaces them again so they can be restored (archived_at -> null).

alter table public.members
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id);

-- Partial index: the common query is "active (non-archived) members", so index
-- the rows where archived_at is null for fast list/count scans.
create index if not exists members_archived_at_idx
  on public.members(archived_at)
  where archived_at is null;
