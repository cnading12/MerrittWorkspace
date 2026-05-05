-- Capture a member-supplied event title for each flex space booking so
-- members can describe what they're using the space for (meeting, art
-- class, workshop, etc.). The title surfaces on the calendar event,
-- confirmation email, and the member's upcoming-bookings list.

alter table public.flex_bookings
  add column if not exists event_title text;
