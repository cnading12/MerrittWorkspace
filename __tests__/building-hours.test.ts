import { describe, it, expect } from 'vitest';
import {
  BUSINESS_OPEN_MINUTES,
  BUSINESS_CLOSE_MINUTES,
  BUSINESS_HOURS_LABEL,
  BUSINESS_HOURS_FULL,
  BUILDING_OPEN_HOURS,
  BUSINESS_OPENS_24H,
  BUSINESS_CLOSES_24H,
  FLEX_OPEN_MINUTES,
  FLEX_CLOSE_MINUTES,
  FLEX_HOURS_LABEL,
  isWithinBusinessHours,
  isAccessCodeRequired,
  isWithinFlexHours,
  accessCodeRequiredNow,
  denverWallClock,
} from '@/lib/hours';

// The workspace is 24/7 for members; what changes through the day is whether
// the front door is unlocked. Business hours are weekdays 7:30 AM – 5:30 PM
// Mountain Time, and a personal access code is needed exactly outside them —
// weekends, and weekdays before 7:30 AM or after 5:30 PM.
//
// These tests pin that rule because it drives what members are told to
// request: get it wrong and either people show up to a locked door with no
// code, or everyone is told to request a code they never need.

const at = (h: number, m = 0) => h * 60 + m;
const MON = 1;
const FRI = 5;
const SAT = 6;
const SUN = 0;

describe('business-hours window', () => {
  it('runs 7:30 AM to 5:30 PM', () => {
    expect(BUSINESS_OPEN_MINUTES).toBe(at(7, 30));
    expect(BUSINESS_CLOSE_MINUTES).toBe(at(17, 30));
  });

  it('is unlocked across a normal weekday', () => {
    expect(isWithinBusinessHours(MON, at(9))).toBe(true);
    expect(isWithinBusinessHours(FRI, at(12))).toBe(true);
    expect(isWithinBusinessHours(FRI, at(17, 29))).toBe(true);
  });

  it('opens exactly at 7:30 and not a minute before', () => {
    expect(isWithinBusinessHours(MON, at(7, 29))).toBe(false);
    expect(isWithinBusinessHours(MON, at(7, 30))).toBe(true);
  });

  it('closes exactly at 5:30 — 5:30 itself is already locked', () => {
    expect(isWithinBusinessHours(MON, at(17, 29))).toBe(true);
    expect(isWithinBusinessHours(MON, at(17, 30))).toBe(false);
  });

  it('is never open on a weekend, however civilised the hour', () => {
    expect(isWithinBusinessHours(SAT, at(12))).toBe(false);
    expect(isWithinBusinessHours(SUN, at(9))).toBe(false);
  });
});

describe('when a personal access code is required', () => {
  it('is not required during business hours', () => {
    expect(isAccessCodeRequired(MON, at(9))).toBe(false);
    expect(isAccessCodeRequired(FRI, at(16))).toBe(false);
  });

  it('is required before 7:30 AM and after 5:30 PM on a weekday', () => {
    expect(isAccessCodeRequired(MON, at(6))).toBe(true);
    expect(isAccessCodeRequired(MON, at(7, 29))).toBe(true);
    expect(isAccessCodeRequired(MON, at(17, 30))).toBe(true);
    expect(isAccessCodeRequired(MON, at(21))).toBe(true);
  });

  it('is required all weekend', () => {
    expect(isAccessCodeRequired(SAT, at(10))).toBe(true);
    expect(isAccessCodeRequired(SUN, at(14))).toBe(true);
  });

  it('is the exact complement of business hours, with no gap or overlap', () => {
    for (let weekday = 0; weekday < 7; weekday++) {
      for (let minutes = 0; minutes < 24 * 60; minutes += 15) {
        expect(isAccessCodeRequired(weekday, minutes)).toBe(
          !isWithinBusinessHours(weekday, minutes),
        );
      }
    }
  });
});

describe('denver wall clock', () => {
  it('reads a Mountain-Time weekday and minute off an instant', () => {
    // 2026-08-17T16:00:00Z is Monday 10:00 AM MDT.
    const { weekday, minutesOfDay } = denverWallClock(new Date('2026-08-17T16:00:00Z'));
    expect(weekday).toBe(MON);
    expect(minutesOfDay).toBe(at(10));
  });

  it('normalises midnight to minute zero rather than hour 24', () => {
    // 2026-08-18T06:00:00Z is Tuesday 00:00 MDT.
    expect(denverWallClock(new Date('2026-08-18T06:00:00Z')).minutesOfDay).toBe(0);
  });

  it('answers the code question for a real instant', () => {
    // Monday 10:00 AM MDT — open, no code.
    expect(accessCodeRequiredNow(new Date('2026-08-17T16:00:00Z'))).toBe(false);
    // Saturday 10:00 AM MDT — locked, code needed.
    expect(accessCodeRequiredNow(new Date('2026-08-22T16:00:00Z'))).toBe(true);
    // Monday 6:00 AM MDT — before open, code needed.
    expect(accessCodeRequiredNow(new Date('2026-08-17T12:00:00Z'))).toBe(true);
  });
});

describe('flex space window', () => {
  it('runs weekdays 8:00 AM to 4:00 PM — narrower than business hours', () => {
    expect(FLEX_OPEN_MINUTES).toBe(at(8));
    expect(FLEX_CLOSE_MINUTES).toBe(at(16));
    expect(FLEX_OPEN_MINUTES).toBeGreaterThanOrEqual(BUSINESS_OPEN_MINUTES);
    expect(FLEX_CLOSE_MINUTES).toBeLessThanOrEqual(BUSINESS_CLOSE_MINUTES);
  });

  it('accepts the edges, since a booking may end exactly at close', () => {
    expect(isWithinFlexHours(MON, at(8))).toBe(true);
    expect(isWithinFlexHours(MON, at(16))).toBe(true);
    expect(isWithinFlexHours(MON, at(7, 59))).toBe(false);
    expect(isWithinFlexHours(MON, at(16, 1))).toBe(false);
  });

  it('is closed at weekends', () => {
    expect(isWithinFlexHours(SAT, at(10))).toBe(false);
    expect(isWithinFlexHours(SUN, at(10))).toBe(false);
  });
});

describe('published labels', () => {
  // Copy across the site and in transactional email is built from these, so a
  // typo here ships everywhere at once.
  it('spells the hours the way the site publishes them', () => {
    expect(BUSINESS_HOURS_LABEL).toBe('7:30 AM – 5:30 PM');
    expect(BUSINESS_HOURS_FULL).toBe('Monday – Friday, 7:30 AM – 5:30 PM');
    expect(BUILDING_OPEN_HOURS).toBe('7:30 AM – 5:30 PM, Monday through Friday');
    expect(FLEX_HOURS_LABEL).toBe('8:00 AM – 4:00 PM');
  });

  it('keeps the structured-data times in step with the labels', () => {
    expect(BUSINESS_OPENS_24H).toBe('07:30');
    expect(BUSINESS_CLOSES_24H).toBe('17:30');
  });
});
