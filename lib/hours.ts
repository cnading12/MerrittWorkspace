// Building hours and the door-access policy — one source of truth.
//
// Two different things get called "hours" around here, and conflating them is
// what put 8:00 AM – 6:00 PM in half the copy and 9:00 AM – 4:30 PM in the
// other half:
//
//   1. MEMBER ACCESS is 24/7. A membership never expires at the end of a day.
//   2. BUSINESS HOURS are when the front door is simply unlocked: weekdays
//      7:30 AM – 5:30 PM Mountain Time. Walk in, no code, nothing to request.
//
// The access code is what bridges the two. Outside business hours the door is
// locked, so entry needs a personal code — which means a member only needs to
// request one if they are coming in on a WEEKEND or on a weekday BEFORE
// 7:30 AM or AFTER 5:30 PM. The code itself works 24/7 once issued and is
// included with every membership at no extra charge; it is the door that
// changes through the day, not the membership.
//
// The flex space (the 1905 church next door) is bookable on a narrower window
// of its own — weekdays 8:00 AM – 4:00 PM. That lives in
// lib/bookings/flex-hours.ts and is re-exported at the bottom of this file so
// callers that just want "the hours" have a single import.
//
// Anything user-facing that quotes a time — marketing copy, portal panels,
// transactional email, structured data — should read it from here rather than
// spelling it out, so the next change to the hours is one edit.

/** Minutes past midnight (Mountain Time) when the front door unlocks. */
export const BUSINESS_OPEN_MINUTES = 7 * 60 + 30; // 7:30 AM

/** Minutes past midnight (Mountain Time) when the front door locks. */
export const BUSINESS_CLOSE_MINUTES = 17 * 60 + 30; // 5:30 PM

/** Just the times: "7:30 AM – 5:30 PM". */
export const BUSINESS_HOURS_LABEL = '7:30 AM – 5:30 PM';

/** Just the days: "Monday – Friday". */
export const BUSINESS_DAYS_LABEL = 'Monday – Friday';

/** Display phrasing: "Monday – Friday, 7:30 AM – 5:30 PM". */
export const BUSINESS_HOURS_FULL = `${BUSINESS_DAYS_LABEL}, ${BUSINESS_HOURS_LABEL}`;

/** Email/prose phrasing: "7:30 AM – 5:30 PM, Monday through Friday". */
export const BUILDING_OPEN_HOURS = `${BUSINESS_HOURS_LABEL}, Monday through Friday`;

/** Short form for tight UI, e.g. a stat tile: "7:30–5:30". */
export const BUSINESS_HOURS_SHORT = '7:30–5:30';

/** ISO-ish 24h strings for structured data (schema.org OpeningHoursSpecification). */
export const BUSINESS_OPENS_24H = '07:30';
export const BUSINESS_CLOSES_24H = '17:30';

/** When a personal access code is actually needed, in one sentence. */
export const ACCESS_CODE_WHEN_NEEDED =
  'weekends, and weekdays before 7:30 AM or after 5:30 PM';

const MT_TZ = 'America/Denver';

function isWeekday(weekday: number): boolean {
  return weekday >= 1 && weekday <= 5;
}

/**
 * Is the front door unlocked at this wall-clock moment?
 *
 * `weekday` is 0=Sun..6=Sat and `minutesOfDay` is minutes past midnight, both
 * already in Mountain Time. The window is half-open: 7:30 AM counts as open,
 * 5:30 PM counts as closed, so the two predicates here never both return true.
 */
export function isWithinBusinessHours(weekday: number, minutesOfDay: number): boolean {
  return (
    isWeekday(weekday) &&
    minutesOfDay >= BUSINESS_OPEN_MINUTES &&
    minutesOfDay < BUSINESS_CLOSE_MINUTES
  );
}

/**
 * Does a member need their personal access code to get in right now? The exact
 * complement of `isWithinBusinessHours` — weekends and weekday
 * before-7:30/after-5:30 arrivals.
 */
export function isAccessCodeRequired(weekday: number, minutesOfDay: number): boolean {
  return !isWithinBusinessHours(weekday, minutesOfDay);
}

/** Mountain-Time weekday + minutes-of-day for an instant. */
export function denverWallClock(now: Date = new Date()): {
  weekday: number;
  minutesOfDay: number;
} {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MT_TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  // Intl can emit "24" for midnight under hour12:false; normalise it to 0.
  const hour = Number(get('hour')) % 24;
  return {
    weekday: weekdayMap[get('weekday')] ?? 0,
    minutesOfDay: hour * 60 + Number(get('minute')),
  };
}

/** Whether a member arriving right now needs their access code. */
export function accessCodeRequiredNow(now: Date = new Date()): boolean {
  const { weekday, minutesOfDay } = denverWallClock(now);
  return isAccessCodeRequired(weekday, minutesOfDay);
}

// ---------------------------------------------------------------------------
// The flex space's bookable window.
//
// It is defined HERE rather than in lib/bookings/flex-hours.ts because client
// components (the booking form, the calendar grid) need these numbers, and
// flex-hours.ts reaches the service-role Supabase client through its
// allowance-accounting imports. This module stays a dependency-free leaf so it
// is safe to import from anywhere; flex-hours.ts re-exports these so the
// booking policy still has a single entry point.
// ---------------------------------------------------------------------------

/** Minutes past midnight (Mountain Time) when the flex space opens. */
export const FLEX_OPEN_MINUTES = 8 * 60; // 8:00 AM

/** Minutes past midnight (Mountain Time) when the flex space closes. */
export const FLEX_CLOSE_MINUTES = 16 * 60; // 4:00 PM

/** Display phrasing: "weekdays 8:00 AM – 4:00 PM". */
export const FLEX_WINDOW_LABEL = 'weekdays 8:00 AM – 4:00 PM';

/** Just the times: "8:00 AM – 4:00 PM". */
export const FLEX_HOURS_LABEL = '8:00 AM – 4:00 PM';

/** Short form for tight UI, e.g. a stat tile: "8–4". */
export const FLEX_HOURS_SHORT = '8–4';

/** `<input type="time">` bounds for a flex start/end picker. */
export const FLEX_OPEN_24H = '08:00';
export const FLEX_CLOSE_24H = '16:00';

/** Is a whole-day-relative minute inside the flex window, on a weekday? */
export function isWithinFlexHours(weekday: number, minutesOfDay: number): boolean {
  return (
    isWeekday(weekday) &&
    minutesOfDay >= FLEX_OPEN_MINUTES &&
    minutesOfDay <= FLEX_CLOSE_MINUTES
  );
}
