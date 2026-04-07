-- Add 'fee_agreement' to the allowed agreement types so members can sign
-- the auto-generated, per-member fee agreement alongside the static
-- member agreement and terms & conditions.

alter table public.member_agreements
  drop constraint if exists member_agreements_agreement_type_check;

alter table public.member_agreements
  add constraint member_agreements_agreement_type_check
  check (agreement_type in ('member_agreement','terms_and_conditions','fee_agreement'));
