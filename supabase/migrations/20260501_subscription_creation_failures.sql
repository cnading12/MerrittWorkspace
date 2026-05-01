-- Logs Stripe subscription creation failures from the
-- checkout.session.completed webhook. Before this table existed, the
-- webhook caught and silently swallowed errors thrown by
-- stripe.subscriptions.create, leaving members in a state where they had
-- paid first month + deposit through Checkout but no recurring
-- subscription on file. With these rows persisted, the admin UI can
-- surface the failure (via subscription_status = 'creation_failed') and
-- a manager can retry creation through the recovery endpoint.

create table if not exists public.subscription_creation_failures (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  stripe_customer_id text,
  error_message text not null,
  payload jsonb,
  attempted_at timestamptz not null default now()
);

create index if not exists subscription_creation_failures_member_id_idx
  on public.subscription_creation_failures (member_id);
create index if not exists subscription_creation_failures_attempted_at_idx
  on public.subscription_creation_failures (attempted_at desc);

alter table public.subscription_creation_failures enable row level security;

-- Service role (webhook + admin recovery route) is the only writer, and
-- only admins should be able to read. Members do not see their own rows.
drop policy if exists subscription_creation_failures_admin_all
  on public.subscription_creation_failures;
create policy subscription_creation_failures_admin_all
  on public.subscription_creation_failures
  for all using (public.is_admin()) with check (public.is_admin());
