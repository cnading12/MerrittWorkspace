-- Merritt Workspace Onboarding Portal Schema
-- Run in Supabase SQL editor. Assumes auth.users (Supabase Auth) exists.

-- ============================================================
-- members: one row per accepted member, linked to auth.users
-- ============================================================
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  email text unique not null,
  first_name text not null,
  last_name text not null,
  phone text,
  company_name text,

  -- Lifecycle
  status text not null default 'pending'
    check (status in ('pending','approved','declined','active','paused','cancelled')),
  application_id uuid,

  -- Plan
  designation text check (designation in
    ('dedicated_desk','private_office_single','private_office_double','private_office_large','flex','other')),
  monthly_cost_cents integer,

  -- Portal gates
  required_docs_complete boolean not null default false,
  agreement_signed boolean not null default false,
  onboarding_unlocked boolean not null default false,

  -- Stripe subscription
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  next_charge_date date,

  -- Building access
  access_code text,
  access_code_issued_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists members_status_idx on public.members(status);
create index if not exists members_email_idx on public.members(email);

-- ============================================================
-- member_applications: raw application form submissions
-- ============================================================
create table if not exists public.member_applications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  email text not null,
  first_name text not null,
  last_name text not null,
  phone text,
  company_name text,
  membership_type text,
  start_date date,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending','approved','declined')),
  decision_note text,
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists member_applications_status_idx on public.member_applications(status);
create index if not exists member_applications_email_idx on public.member_applications(email);

-- ============================================================
-- member_documents: uploaded files (ID, business docs, etc.)
-- Files live in Supabase Storage bucket "member-documents".
-- ============================================================
create table if not exists public.member_documents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  doc_type text not null,
  -- e.g. 'photo_id','proof_of_address','business_registration',
  --      'member_agreement','terms_and_conditions','other'
  file_path text not null,
  file_name text,
  mime_type text,
  size_bytes integer,
  status text not null default 'submitted'
    check (status in ('submitted','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists member_documents_member_idx on public.member_documents(member_id);

-- ============================================================
-- member_agreements: signature records for legal docs
-- ============================================================
create table if not exists public.member_agreements (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  agreement_type text not null
    check (agreement_type in ('member_agreement','terms_and_conditions')),
  signature_name text not null,
  signed_at timestamptz not null default now(),
  ip_address text,
  user_agent text,
  document_version text,
  unique(member_id, agreement_type)
);

-- ============================================================
-- payment_history: synced from Stripe webhooks
-- ============================================================
create table if not exists public.payment_history (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  stripe_invoice_id text unique,
  stripe_payment_intent_id text,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null,
  -- 'succeeded','failed','pending','refunded'
  description text,
  invoice_pdf_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payment_history_member_idx on public.payment_history(member_id);

-- ============================================================
-- access_code_requests: member asks, admin fulfills with code from POPS
-- ============================================================
create table if not exists public.access_code_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','fulfilled','denied')),
  requested_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  fulfilled_by uuid references auth.users(id),
  access_code text,
  notes text
);

create index if not exists access_code_requests_status_idx on public.access_code_requests(status);

-- ============================================================
-- admin_users: who can access the admin panel
-- ============================================================
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('admin','superadmin')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists members_updated_at on public.members;
create trigger members_updated_at before update on public.members
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.members enable row level security;
alter table public.member_applications enable row level security;
alter table public.member_documents enable row level security;
alter table public.member_agreements enable row level security;
alter table public.payment_history enable row level security;
alter table public.access_code_requests enable row level security;
alter table public.admin_users enable row level security;

-- Helper: is current user an admin?
create or replace function public.is_admin() returns boolean as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$ language sql stable security definer;

-- Members: a user can read their own row; admins can read/write all.
drop policy if exists members_self_select on public.members;
create policy members_self_select on public.members
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists members_admin_all on public.members;
create policy members_admin_all on public.members
  for all using (public.is_admin()) with check (public.is_admin());

-- Documents: own + admin
drop policy if exists docs_self_select on public.member_documents;
create policy docs_self_select on public.member_documents
  for select using (
    member_id in (select id from public.members where user_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists docs_self_insert on public.member_documents;
create policy docs_self_insert on public.member_documents
  for insert with check (
    member_id in (select id from public.members where user_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists docs_admin_all on public.member_documents;
create policy docs_admin_all on public.member_documents
  for all using (public.is_admin()) with check (public.is_admin());

-- Agreements: own + admin
drop policy if exists agreements_self on public.member_agreements;
create policy agreements_self on public.member_agreements
  for all using (
    member_id in (select id from public.members where user_id = auth.uid())
    or public.is_admin()
  ) with check (
    member_id in (select id from public.members where user_id = auth.uid())
    or public.is_admin()
  );

-- Payment history: read own, admin all (writes via service role only)
drop policy if exists payments_self_select on public.payment_history;
create policy payments_self_select on public.payment_history
  for select using (
    member_id in (select id from public.members where user_id = auth.uid())
    or public.is_admin()
  );

-- Access code requests: own + admin
drop policy if exists access_self on public.access_code_requests;
create policy access_self on public.access_code_requests
  for all using (
    member_id in (select id from public.members where user_id = auth.uid())
    or public.is_admin()
  ) with check (
    member_id in (select id from public.members where user_id = auth.uid())
    or public.is_admin()
  );

-- Applications: admin only via RLS (insert happens via service role from public form)
drop policy if exists applications_admin on public.member_applications;
create policy applications_admin on public.member_applications
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- Storage bucket for member documents (run separately if needed):
--   insert into storage.buckets (id, name, public) values ('member-documents','member-documents', false);
-- Then add storage policies allowing authenticated users to read/write
-- objects under a path prefixed with their member_id.
-- ============================================================
