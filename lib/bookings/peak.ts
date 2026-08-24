// Peak vs. off-peak hours for the conference room.
//
// The room is bookable 24/7, but only PEAK hours draw on a member's monthly
// allowance: weekdays 7:30 AM – 5:30 PM Mountain Time, the building's business
// hours (lib/hours.ts). Evenings, nights and weekends are unlimited and free
// for every tier — they cost the workspace nothing, so metering them only
// discourages use.
//
// A booking that straddles the boundary is prorated by the MINUTE, so a
// 5:00–7:00 PM booking spends half an allowance hour (5:00–5:30) and gets the
// rest free. Minute-level proration is what lets the window sit on a half hour
// at all: the previous whole-hour rule ("count an hour only if it fits
// entirely inside the window") would silently shrink a 7:30–5:30 policy to an
// 8:00–5:00 one, because no whole hour from a whole-hour start fits inside
// either boundary half-hour.
//
// booking_date is a plain calendar date and start_time a plain HH:MM, both
// already Mountain Time (that is what the member picked and what lands on the
// calendar), so no timezone conversion happens here. A booking that runs past
// midnight rolls into the next weekday correctly — and every hour between
// midnight and 7:30 AM is off-peak on any day regardless.

import { BUSINESS_OPEN_MINUTES, BUSINESS_CLOSE_MINUTES } from '@/lib/hours';

// Weekdays only, 7:30 AM – 5:30 PM — the building's business hours.
export const PEAK_START_MINUTES = BUSINESS_OPEN_MINUTES;
export const PEAK_END_MINUTES = BUSINESS_CLOSE_MINUTES;

const MINUTES_PER_DAY = 24 * 60;

export const PEAK_WINDOW_LABEL = 'weekdays 7:30 AM – 5:30 PM';

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

// How many of the 60 minutes beginning at `minuteOfDay` on `weekday` fall
// inside the peak window. 0 on a weekend, 60 for an hour sitting wholly
// inside it, and something in between for an hour straddling either edge.
function peakMinutesInHour(weekday: number, minuteOfDay: number): number {
  if (!isWeekday(weekday)) return 0;
  const overlapStart = Math.max(minuteOfDay, PEAK_START_MINUTES);
  const overlapEnd = Math.min(minuteOfDay + 60, PEAK_END_MINUTES);
  return Math.max(0, overlapEnd - overlapStart);
}

export interface PeakSplit {
  // Hours that draw on the monthly allowance (or bill as overage). Can be
  // fractional when a booking straddles the 7:30 or 5:30 boundary.
  peakHours: number;
  // Hours outside the window — unlimited and free for every tier.
  offPeakHours: number;
}

// Round to whole minutes' worth of an hour, so floating-point noise never
// leaks into a stored included_hours value.
function roundHours(hours: number): number {
  return Math.round(hours * 60) / 60;
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

  let peakMinutes = 0;
  for (let i = 0; i < durationHours; i++) {
    const offset = startMinutes + i * 60;
    // Roll past midnight onto the following weekday.
    const dayOffset = Math.floor(offset / MINUTES_PER_DAY);
    const minuteOfDay = ((offset % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    const weekday = (((baseWeekday + dayOffset) % 7) + 7) % 7;
    peakMinutes += peakMinutesInHour(weekday, minuteOfDay);
  }

  const peakHours = roundHours(peakMinutes / 60);
  return {
    peakHours,
    offPeakHours: roundHours(Math.max(0, durationHours - peakHours)),
  };
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
