import { describe, it, expect } from 'vitest';
import {
  splitPeakHours,
  isFullyOffPeak,
  weekdayForDate,
  PEAK_START_MINUTES,
  PEAK_END_MINUTES,
} from '@/lib/bookings/peak';
import { BUSINESS_OPEN_MINUTES, BUSINESS_CLOSE_MINUTES } from '@/lib/hours';

// The conference room is bookable around the clock, but only the building's
// business hours — weekdays 7:30 AM – 5:30 PM MT — draw on a member's monthly
// allowance. Everything else is unlimited and free for every tier. These tests
// pin the boundary, because getting it wrong either bills members for evenings
// we said were free or gives away peak hours we meter.
//
// The window sits on a half hour at each end, so the boundary hours are
// PRORATED: a 7:00–8:00 AM hour is half metered, not all-or-nothing.
//
// 2026-08-17 is a Monday; 2026-08-22 a Saturday; 2026-08-23 a Sunday.

describe('weekdayForDate', () => {
  it('reads the weekday off a plain date without timezone drift', () => {
    expect(weekdayForDate('2026-08-17')).toBe(1); // Monday
    expect(weekdayForDate('2026-08-22')).toBe(6); // Saturday
    expect(weekdayForDate('2026-08-23')).toBe(0); // Sunday
  });
});

describe('splitPeakHours — the window itself', () => {
  it('counts a mid-morning weekday booking entirely as peak', () => {
    expect(splitPeakHours('2026-08-17', '10:00', 2)).toEqual({
      peakHours: 2,
      offPeakHours: 0,
    });
  });

  it('prorates a booking straddling the 5:30 PM edge', () => {
    // 5–7 PM: only 5:00–5:30 is metered, the remaining 90 minutes are free.
    expect(splitPeakHours('2026-08-17', '17:00', 2)).toEqual({
      peakHours: 0.5,
      offPeakHours: 1.5,
    });
  });

  it('prorates a booking straddling the 7:30 AM edge', () => {
    // 7–9 AM: 7:00–7:30 is free, 7:30–9:00 is metered.
    expect(splitPeakHours('2026-08-17', '07:00', 2)).toEqual({
      peakHours: 1.5,
      offPeakHours: 0.5,
    });
  });

  it('meters only the first half of the hour beginning at 5:00 PM', () => {
    expect(splitPeakHours('2026-08-17', '17:00', 1).peakHours).toBe(0.5);
  });

  it('does not meter an hour starting at or after 5:30 PM', () => {
    expect(splitPeakHours('2026-08-17', '18:00', 1).peakHours).toBe(0);
  });

  it('meters only the second half of the hour beginning at 7:00 AM', () => {
    expect(splitPeakHours('2026-08-17', '07:00', 1).peakHours).toBe(0.5);
  });

  it('meters a whole hour starting at 8:00 AM, safely inside the window', () => {
    expect(splitPeakHours('2026-08-17', '08:00', 1).peakHours).toBe(1);
  });

  it('does not meter an hour ending at or before 7:30 AM', () => {
    expect(splitPeakHours('2026-08-17', '06:00', 1).peakHours).toBe(0);
  });

  it('meters a full business day as exactly the window length', () => {
    // 7 AM – 6 PM covers the whole 7:30–5:30 window and nothing more.
    expect(splitPeakHours('2026-08-17', '07:00', 11).peakHours).toBe(10);
  });

  it('keeps the exported bounds in step with the building business hours', () => {
    expect(PEAK_START_MINUTES).toBe(7 * 60 + 30);
    expect(PEAK_END_MINUTES).toBe(17 * 60 + 30);
    // The peak window IS business hours — if one moves, so must the other.
    expect(PEAK_START_MINUTES).toBe(BUSINESS_OPEN_MINUTES);
    expect(PEAK_END_MINUTES).toBe(BUSINESS_CLOSE_MINUTES);
  });
});

describe('splitPeakHours — weekends', () => {
  it('gives a Saturday booking no peak hours even at midday', () => {
    expect(splitPeakHours('2026-08-22', '10:00', 4)).toEqual({
      peakHours: 0,
      offPeakHours: 4,
    });
  });

  it('gives a Sunday booking no peak hours', () => {
    expect(splitPeakHours('2026-08-23', '09:00', 3).peakHours).toBe(0);
  });
});

describe('splitPeakHours — across midnight', () => {
  it('treats the small hours as off-peak on a weekday', () => {
    // 11 PM Monday through 3 AM Tuesday: none of it is peak.
    expect(splitPeakHours('2026-08-17', '23:00', 4)).toEqual({
      peakHours: 0,
      offPeakHours: 4,
    });
  });

  it('rolls a Friday-night booking into Saturday without counting it', () => {
    expect(splitPeakHours('2026-08-21', '23:00', 2).peakHours).toBe(0);
  });

  it('rolls a Sunday-night booking into Monday and meters the Monday hours', () => {
    // Sunday 11 PM + 10 hours ends 9 AM Monday. Monday's 7–8 AM hour is half
    // metered and 8–9 AM fully, so 1.5 hours draw on the allowance.
    expect(splitPeakHours('2026-08-23', '23:00', 10)).toEqual({
      peakHours: 1.5,
      offPeakHours: 8.5,
    });
  });
});

describe('isFullyOffPeak', () => {
  it('is true for an evening booking and false once any hour is metered', () => {
    expect(isFullyOffPeak('2026-08-17', '19:00', 3)).toBe(true);
    expect(isFullyOffPeak('2026-08-22', '10:00', 4)).toBe(true);
    expect(isFullyOffPeak('2026-08-17', '17:00', 2)).toBe(false);
  });

  it('is false for a booking that only clips the window by half an hour', () => {
    // 7–8 AM is half metered; "fully off-peak" must not round that away.
    expect(isFullyOffPeak('2026-08-17', '07:00', 1)).toBe(false);
  });
});
