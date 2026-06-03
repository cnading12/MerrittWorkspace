-- Cancellation confirmation email idempotency.
--
-- When a membership is cancelled (by the member from the portal, or by an
-- admin on their behalf) we send two transactional emails: one to the member
-- confirming the cancellation + policy, and one notifying staff. The Cancel
-- button is easy to press more than once, and our cancel routes can also be
-- re-entered via their idempotent "already cancelled / reconcile" paths, so we
-- must guarantee each party is emailed AT MOST ONCE.
--
-- We track this per-recipient (rather than a single flag) so that if one send
-- fails we can retry just that recipient without re-spamming the other. The
-- send helper claims a recipient by flipping its column from null -> now() in a
-- single conditional UPDATE; only the caller whose UPDATE actually matched a
-- row (column still null) is allowed to send, which makes concurrent
-- double-clicks safe.

alter table public.members
  add column if not exists cancellation_email_member_sent_at timestamptz,
  add column if not exists cancellation_email_staff_sent_at timestamptz;
