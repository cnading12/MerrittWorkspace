// Peak vs. off-peak hours for the conference room.
//
// The room is bookable 24/7, but only PEAK hours draw on a member's monthly
// allowance: weekdays 8:00 AM – 6:00 PM Mountain Time. Evenings, nights and
// weekends are unlimited and free for every tier — they cost the workspace
// nothing, so metering them only discourages use.
//
// A booking that straddles the boundary is prorated hour by hour: a 5–7 PM
// booking spends one allowance hour (5–6) and gets the other free (6–7).
// Bookings run in whole hours from a whole-hour start, so counting whole
// hours is exact rather than an approximation.
//
// booking_date is a plain calendar date and start_time a plain HH:MM, both
// already Mountain Time (that is what the member picked and what lands on the
// calendar), so no timezone conversion happens here. A booking that runs past
// midnight rolls into the next weekday correctly — and every hour between
// midnight and 8 AM is off-peak on any day regardless.

// Weekdays only, 8:00 AM – 6:00 PM.
export const PEAK_START_MINUTES = 8 * 60;
export const PEAK_END_MINUTES = 18 * 60;

const MINUTES_PER_DAY = 24 * 60;

export const PEAK_WINDOW_LABEL = 'weekdays 8:00 AM – 6:00 PM';

// Weekday (0=Sun..6=Sat) of a plain YYYY-MM-DD date. Built in UTC so the
// host machine's timezone can't shift the date across a day boundary — this
// is calendar arithmetic on a date the member already chose, not an instant.
export function weekdayForDate(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function isWeekday(weekday: number): boolean {
  return weekday >= 1 && weekday <= 5;
}

// Is the whole hour beginning at `minuteOfDay` on `weekday` inside the peak
// window? The hour must fit entirely inside it: an hour starting at 5:00 PM
// ends at 6:00 PM and counts; one starting at 6:00 PM does not.
function isPeakHour(weekday: number, minuteOfDay: number): boolean {
  return (
    isWeekday(weekday) &&
    minuteOfDay >= PEAK_START_MINUTES &&
    minuteOfDay + 60 <= PEAK_END_MINUTES
  );
}

export interface PeakSplit {
  // Hours that draw on the monthly allowance (or bill as overage).
  peakHours: number;
  // Hours outside the window — unlimited and free for every tier.
  offPeakHours: number;
}

// Split a booking into its metered and unmetered hours.
//
// `startTime` is HH:MM in Mountain Time, `durationHours` a whole number of
// hours. Both match what the booking routes already validate.
export function splitPeakHours(
  bookingDate: string,
  startTime: string,
  durationHours: number,
): PeakSplit {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const baseWeekday = weekdayForDate(bookingDate);

  let peakHours = 0;
  for (let i = 0; i < durationHours; i++) {
    const offset = startMinutes + i * 60;
    // Roll past midnight onto the following weekday.
    const dayOffset = Math.floor(offset / MINUTES_PER_DAY);
    const minuteOfDay = ((offset % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    const weekday = (((baseWeekday + dayOffset) % 7) + 7) % 7;
    if (isPeakHour(weekday, minuteOfDay)) peakHours++;
  }

  return { peakHours, offPeakHours: Math.max(0, durationHours - peakHours) };
}

// True when none of the booking's hours are metered — used to skip the
// allowance check entirely and to label the booking in the UI.
export function isFullyOffPeak(
  bookingDate: string,
  startTime: string,
  durationHours: number,
): boolean {
  return splitPeakHours(bookingDate, startTime, durationHours).peakHours === 0;
}
