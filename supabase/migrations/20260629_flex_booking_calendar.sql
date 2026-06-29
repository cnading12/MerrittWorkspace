-- Flex space bookings now land directly on the shared wellness calendar so
-- coworking flex reservations and wellness bookings live in one place and can
-- never silently double-book each other.
--
-- Record which Google calendar each booking's event was created on. Legacy
-- rows created before this change have their event on the old Flex Space
-- Bookings calendar (FLEX_CALENDAR_ID); new rows record the wellness calendar.
-- Cancellation reads this column so it always deletes the event from the
-- calendar it actually lives on.
alter table public.flex_bookings
  add column if not exists google_calendar_id text;
