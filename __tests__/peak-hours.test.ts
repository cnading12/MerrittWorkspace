import { describe, it, expect } from 'vitest';
import {
  splitPeakHours,
  isFullyOffPeak,
  weekdayForDate,
  PEAK_START_MINUTES,
  PEAK_END_MINUTES,
} from '@/lib/bookings/peak';

// The conference room is bookable around the clock, but only weekdays
// 8:00 AM – 6:00 PM MT draw on a member's monthly allowance. Everything else
// is unlimited and free for every tier. These tests pin the boundary, because
// getting it wrong either bills members for evenings we said were free or
// gives away peak hours we meter.
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

  it('prorates a booking straddling the 6 PM edge', () => {
    // The example from the spec: 5–7 PM spends one hour, gets one free.
    expect(splitPeakHours('2026-08-17', '17:00', 2)).toEqual({
      peakHours: 1,
      offPeakHours: 1,
    });
  });

  it('prorates a booking straddling the 8 AM edge', () => {
    expect(splitPeakHours('2026-08-17', '07:00', 2)).toEqual({
      peakHours: 1,
      offPeakHours: 1,
    });
  });

  it('counts the last hour that ends exactly at 6 PM', () => {
    expect(splitPeakHours('2026-08-17', '17:00', 1).peakHours).toBe(1);
  });

  it('does not count an hour starting exactly at 6 PM', () => {
    expect(splitPeakHours('2026-08-17', '18:00', 1).peakHours).toBe(0);
  });

  it('counts the first hour starting exactly at 8 AM', () => {
    expect(splitPeakHours('2026-08-17', '08:00', 1).peakHours).toBe(1);
  });

  it('does not count an hour ending exactly at 8 AM', () => {
    expect(splitPeakHours('2026-08-17', '07:00', 1).peakHours).toBe(0);
  });

  it('keeps the exported bounds in step with the window it enforces', () => {
    expect(PEAK_START_MINUTES).toBe(8 * 60);
    expect(PEAK_END_MINUTES).toBe(18 * 60);
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
    // Sunday 11 PM + 10 hours ends 9 AM Monday. Only 8–9 AM Monday is peak.
    expect(splitPeakHours('2026-08-23', '23:00', 10)).toEqual({
      peakHours: 1,
      offPeakHours: 9,
    });
  });
});

describe('isFullyOffPeak', () => {
  it('is true for an evening booking and false once any hour is metered', () => {
    expect(isFullyOffPeak('2026-08-17', '19:00', 3)).toBe(true);
    expect(isFullyOffPeak('2026-08-22', '10:00', 4)).toBe(true);
    expect(isFullyOffPeak('2026-08-17', '17:00', 2)).toBe(false);
  });
});
