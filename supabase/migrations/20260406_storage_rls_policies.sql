-- Storage RLS policies for the `member-documents` bucket.
--
-- Layout: each member's files live under a folder named after their
-- `members.id` UUID, e.g. `<member_id>/photo_id-2026-04-06.pdf`.
--
-- Rules:
--   - Authenticated members may read/write/delete objects ONLY inside
--     their own `<member_id>/` folder.
--   - Admins (rows in `admin_users`) may read all objects in the bucket.
--   - Service-role calls (the API routes) bypass RLS automatically.
--
-- These policies have already been applied manually in production; this
-- file exists so future environments can be provisioned reproducibly.

-- Make sure the bucket exists and is private.
insert into storage.buckets (id, name, public)
values ('member-documents', 'member-documents', false)
on conflict (id) do nothing;

-- Helper: resolve the members.id for the current auth.uid().
-- We inline the lookup in each policy below to avoid creating a new
-- function (keeps this migration self-contained).

-- Members can read their own files.
drop policy if exists "member read own docs" on storage.objects;
create policy "member read own docs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'member-documents'
    and (storage.foldername(name))[1] = (
      select id::text from public.members where user_id = auth.uid()
    )
  );

-- Members can upload to their own folder.
drop policy if exists "member insert own docs" on storage.objects;
create policy "member insert own docs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'member-documents'
    and (storage.foldername(name))[1] = (
      select id::text from public.members where user_id = auth.uid()
    )
  );

-- Members can replace/delete their own files.
drop policy if exists "member update own docs" on storage.objects;
create policy "member update own docs"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'member-documents'
    and (storage.foldername(name))[1] = (
      select id::text from public.members where user_id = auth.uid()
    )
  );

drop policy if exists "member delete own docs" on storage.objects;
create policy "member delete own docs"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'member-documents'
    and (storage.foldername(name))[1] = (
      select id::text from public.members where user_id = auth.uid()
    )
  );

-- Admins can read everything in the bucket.
drop policy if exists "admin read all docs" on storage.objects;
create policy "admin read all docs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'member-documents'
    and exists (
      select 1 from public.admin_users where user_id = auth.uid()
    )
  );
