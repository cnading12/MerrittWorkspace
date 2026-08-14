-- Signup-completion email idempotency.
--
-- When a member finishes the onboarding portal (docs + agreements + payment,
-- i.e. Stripe `checkout.session.completed` flips `onboarding_unlocked`) we send
-- two transactional emails: a welcome/orientation email to the new member and a
-- "someone officially signed up" notification to the management team.
--
-- Stripe retries webhooks on any non-2xx response, and the same session can be
-- delivered more than once, so both sends must be AT MOST ONCE. We track this
-- per-recipient (same pattern as cancellation_email_*_sent_at) so a failure on
-- one side can be retried without re-spamming the other. The send helper claims
-- a recipient by flipping its column from null -> now() in a single conditional
-- UPDATE; only the caller whose UPDATE actually matched a row is allowed to send.

alter table public.members
  add column if not exists signup_email_member_sent_at timestamptz,
  add column if not exists signup_email_staff_sent_at timestamptz;
