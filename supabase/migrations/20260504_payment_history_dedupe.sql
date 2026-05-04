-- Fix duplicate rows in payment_history.
--
-- Background: the admin member detail route walks the customer's Stripe
-- PaymentIntents on every load and inserts any that aren't already in
-- payment_history. The dedup key was stripe_payment_intent_id only, but
-- the invoice.paid webhook records subscription invoices under
-- stripe_invoice_id with a NULL stripe_payment_intent_id (Stripe API
-- 2025-08-27.basil dropped Invoice.payment_intent without expansion).
-- Result: every admin page load re-inserted the matching PaymentIntent
-- as a fresh row labeled "Subscription creation" / "Subscription update"
-- alongside the canonical "Membership" row from the webhook.
--
-- The application code was patched to dedupe by invoice ID and to
-- backfill the PI ID on existing rows. This migration cleans up the
-- duplicates that already accumulated and adds a unique partial index so
-- the same row can never be inserted twice.

-- 1. Delete duplicates that share a stripe_payment_intent_id, keeping
--    the row that has invoice metadata (invoice_pdf_url and/or
--    stripe_invoice_id) — that's the canonical row written by the
--    webhook. Falls back to the oldest row otherwise.
with ranked as (
  select
    id,
    row_number() over (
      partition by stripe_payment_intent_id
      order by
        (invoice_pdf_url is not null) desc,
        (stripe_invoice_id is not null) desc,
        created_at asc
    ) as rn
  from public.payment_history
  where stripe_payment_intent_id is not null
)
delete from public.payment_history
where id in (select id from ranked where rn > 1);

-- 2. Collapse rows where the same invoice charge was recorded once by
--    the webhook (with stripe_invoice_id, no PI) and once by the admin
--    backfill (with stripe_payment_intent_id, no invoice). Match on
--    member + amount + paid date; keep the row with the invoice link.
with pairs as (
  select
    keeper.id as keeper_id,
    dup.id as dup_id,
    dup.stripe_payment_intent_id as dup_pi
  from public.payment_history keeper
  join public.payment_history dup
    on dup.id <> keeper.id
   and dup.member_id is not distinct from keeper.member_id
   and dup.amount_cents = keeper.amount_cents
   and date_trunc('day', coalesce(dup.paid_at, dup.created_at))
     = date_trunc('day', coalesce(keeper.paid_at, keeper.created_at))
  where keeper.stripe_invoice_id is not null
    and keeper.stripe_payment_intent_id is null
    and dup.stripe_invoice_id is null
    and dup.stripe_payment_intent_id is not null
),
-- Carry the dup row's PI ID onto the keeper before deleting, so the
-- canonical row ends up with both identifiers set.
backfill as (
  update public.payment_history ph
  set stripe_payment_intent_id = pairs.dup_pi
  from pairs
  where ph.id = pairs.keeper_id
  returning ph.id
)
delete from public.payment_history
where id in (select dup_id from pairs);

-- 3. Prevent future duplicates at the database level. A partial unique
--    index lets the existing rows with NULL PI IDs coexist (each NULL
--    is distinct under standard SQL), while guaranteeing any non-null
--    PaymentIntent appears at most once.
create unique index if not exists payment_history_pi_unique
  on public.payment_history(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
