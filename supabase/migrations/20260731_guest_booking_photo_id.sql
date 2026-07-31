-- ============================================================
-- Guest booking photo ID.
--
-- Non-members can rent the conference room at $25/hr without creating an
-- account, but they must now attach a photo ID when booking — the same
-- photo_id requirement members satisfy in the portal documents flow.
--
-- The uploaded file lives in the private `member-documents` bucket under
-- guest-bookings/<booking_ref>/photo_id-<ts>.<ext> (a prefix no member id
-- can collide with, so the member self-read storage policies never match
-- it; admins view it via service-role signed URLs on the admin Documents
-- page). This column records that storage path on the booking row.
--
-- Null for member bookings and for guest bookings made before this
-- requirement existed.
-- ============================================================
alter table public.conference_bookings
  add column if not exists id_document_path text;
