-- ============================================================
-- snack_orders: persists every completed Snackshop purchase.
--
-- Until now Snackshop purchases were never recorded anywhere — the
-- Stripe webhook only sent confirmation emails. This table gives us a
-- durable record so members can see their purchase history in the portal
-- and staff can reconcile sales.
--
-- Rows are written by server-side code only (Stripe webhook for guest /
-- hosted-checkout orders, and the member one-click checkout route). The
-- two unique indexes on the Stripe identifiers make those writes
-- idempotent, so a webhook that is delivered more than once (or delivered
-- to both the /api/snackshop and /api/webhooks/snack-shop endpoints) can
-- never create a duplicate order.
-- ============================================================
create table if not exists public.snack_orders (
  id uuid primary key default gen_random_uuid(),
  -- Linked member when the buyer was signed into the portal at checkout.
  -- Null for guest / walk-in / trial purchases.
  member_id uuid references public.members(id) on delete set null,

  -- Human-friendly order number (e.g. MW12345678), mirrors the id shown in
  -- the existing confirmation emails.
  order_number text not null,

  -- Snapshot of who placed the order. Captured even for members so the
  -- record stays accurate if the member later changes their profile.
  customer_name text not null,
  customer_email text not null,
  office_number text,
  notes text,

  -- Cart snapshot: [{ id, name, price, quantity }]. Stored as jsonb so the
  -- portal history view and any future reporting can read line items
  -- without a separate order_items table.
  items jsonb not null default '[]'::jsonb,

  -- Money is stored in integer cents to match payment_history and avoid
  -- floating-point drift.
  total_cents integer not null,
  currency text not null default 'usd',

  -- 'card' = guest / hosted Stripe Checkout, 'saved_card' = member
  -- one-click charge against a card already on file.
  payment_method text not null default 'card'
    check (payment_method in ('card', 'saved_card')),
  is_member_order boolean not null default false,

  -- Stripe references. Hosted-checkout orders have a session id; member
  -- one-click orders have only a payment intent id. Either uniquely
  -- identifies the order for idempotency.
  stripe_session_id text,
  stripe_payment_intent_id text,

  status text not null default 'paid'
    check (status in ('paid', 'refunded', 'failed')),

  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- Idempotency: never record the same Stripe object twice.
create unique index if not exists snack_orders_session_uniq
  on public.snack_orders(stripe_session_id)
  where stripe_session_id is not null;
create unique index if not exists snack_orders_pi_uniq
  on public.snack_orders(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- Fast "my purchases (last 30 days)" lookups for the portal.
create index if not exists snack_orders_member_idx
  on public.snack_orders(member_id, created_at desc);
create index if not exists snack_orders_email_idx
  on public.snack_orders(customer_email);

-- ============================================================
-- Row Level Security: members read their own orders; admins read all.
-- All writes happen through the service-role key (webhook / checkout
-- routes), which bypasses RLS, so no insert/update policies are needed.
-- Mirrors the payment_history policy in 20260406_onboarding_portal.sql.
-- ============================================================
alter table public.snack_orders enable row level security;

drop policy if exists snack_orders_self_select on public.snack_orders;
create policy snack_orders_self_select on public.snack_orders
  for select using (
    member_id in (select id from public.members where user_id = auth.uid())
    or public.is_admin()
  );
