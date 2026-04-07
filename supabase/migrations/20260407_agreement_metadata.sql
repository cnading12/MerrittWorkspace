-- Add metadata jsonb to member_agreements so the per-member fee agreement
-- can store the billing contact, federal ID, invoicing details, and the
-- calculated totals snapshot at the time of signing.

alter table public.member_agreements
  add column if not exists metadata jsonb;
