-- Cancellation tracking: when a member cancels, we record the notice date
-- and the effective last-day-of-membership so the portal and admin views
-- can surface the actual end date instead of a vague "end of period" string.
-- We also store the Stripe invoice item ID for the last-month credit so we
-- can reverse it if the member reactivates before cancellation takes effect.

alter table public.members
  add column if not exists cancellation_notice_received_at timestamptz,
  add column if not exists cancellation_effective_date date,
  add column if not exists last_month_credit_invoice_item_id text;
