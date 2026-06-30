-- ============================================================
-- conference_bookings: persists every conference-room booking.
--
-- Conference-room bookings used to live only in Google Calendar + Stripe
-- metadata (database-free). This table records each booking so we can:
--   * enforce members' tiered monthly included-hours allotment,
--   * auto-charge the $25/hr overage beyond it, and
--   * show members their booking history in the portal.
--
-- One row per booking. `included_hours` is the portion drawn from the
-- member's monthly allotment (0 for guests); `billed_hours` is the portion
-- charged at the hourly rate. Writes happen server-side only (member
-- booking route + the meeting-rooms Stripe webhook); the unique indexes on
-- the Stripe ids keep webhook deliveries idempotent.
-- ============================================================
create table if not exists public.conference_bookings (
  id uuid primary key default gen_random_uuid(),
  -- Linked member when booked by a signed-in member. Null for guest /
  -- walk-in / tour bookings paid online.
  member_id uuid references public.members(id) on delete set null,

  -- Human-friendly booking reference (MH-MEMBER-* / MH-PAID-*), mirrors the
  -- id used in the confirmation emails and calendar event.
  booking_ref text not null,

  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  company text,

  booking_date date not null,
  start_time text not null, -- HH:MM (local, America/Denver)
  end_time text not null,   -- HH:MM
  duration_hours numeric(4,1) not null,

  -- Hours drawn from the member's monthly allotment vs. hours charged at the
  -- hourly rate. included + billed = duration for member bookings; for guest
  -- bookings included = 0 and billed = duration.
  included_hours numeric(4,1) not null default 0,
  billed_hours numeric(4,1) not null default 0,

  attendees integer,
  purpose text,

  total_cents integer not null default 0,
  currency text not null default 'usd',

  is_member_booking boolean not null default false,

  status text not null default 'confirmed'
    check (status in ('confirmed', 'cancelled')),
  -- 'included' = covered by allotment (no charge), 'paid' = charged,
  -- 'pending' = awaiting hosted-checkout payment, etc.
  payment_status text not null default 'paid'
    check (payment_status in ('included', 'paid', 'pending', 'failed', 'refunded')),

  google_event_id text,
  stripe_session_id text,
  stripe_payment_intent_id text,

  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Idempotency for webhook-driven inserts.
create unique index if not exists conference_bookings_session_uniq
  on public.conference_bookings(stripe_session_id)
  where stripe_session_id is not null;
create unique index if not exists conference_bookings_pi_uniq
  on public.conference_bookings(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- Drives the monthly allotment query and the portal "last 30 days" view.
create index if not exists conference_bookings_member_date_idx
  on public.conference_bookings(member_id, booking_date);
create index if not exists conference_bookings_email_idx
  on public.conference_bookings(customer_email);

-- ============================================================
-- Row Level Security: members read their own bookings; admins read all.
-- Writes go through the service-role key, which bypasses RLS. Mirrors the
-- payment_history / snack_orders policies.
-- ============================================================
alter table public.conference_bookings enable row level security;

drop policy if exists conference_bookings_self_select on public.conference_bookings;
create policy conference_bookings_self_select on public.conference_bookings
  for select using (
    member_id in (select id from public.members where user_id = auth.uid())
    or public.is_admin()
  );
