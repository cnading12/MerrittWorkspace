-- Track when each member was last pinged with a portal-completion reminder.
-- Multiple admins share the same admin account, so we surface a "last pinged
-- X ago" label in the admin panel to avoid different admins repeatedly
-- emailing the same member with the same reminder.

alter table public.members
  add column if not exists last_pinged_at timestamptz;
