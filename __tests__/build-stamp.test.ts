import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { currentBuildStamp, isStaleBuild, UNKNOWN_BUILD } from '@/lib/buildStamp';
import { GET as versionRoute } from '@/app/api/version/route';

// The stale-tab detector must never cry wolf: a false "stale" either reloads
// a current tab in a loop or parks a permanent red banner over a healthy
// panel, and either teaches staff to ignore the one banner that matters.

const ORIGINAL = process.env.NEXT_PUBLIC_BUILD_STAMP;

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_BUILD_STAMP;
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_BUILD_STAMP;
  else process.env.NEXT_PUBLIC_BUILD_STAMP = ORIGINAL;
});

describe('isStaleBuild', () => {
  it('is stale only when both stamps are real and disagree', () => {
    expect(isStaleBuild('abc1234', 'def5678')).toBe(true);
    expect(isStaleBuild('abc1234', 'abc1234')).toBe(false);
  });

  it('never reports stale when either side is missing or unknown', () => {
    expect(isStaleBuild(null, 'abc1234')).toBe(false);
    expect(isStaleBuild('abc1234', null)).toBe(false);
    expect(isStaleBuild(undefined, undefined)).toBe(false);
    expect(isStaleBuild('', 'abc1234')).toBe(false);
    expect(isStaleBuild(UNKNOWN_BUILD, 'abc1234')).toBe(false);
    expect(isStaleBuild('abc1234', UNKNOWN_BUILD)).toBe(false);
  });
});

describe('currentBuildStamp', () => {
  it('reads the baked stamp, and says unknown rather than inventing one', () => {
    expect(currentBuildStamp()).toBe(UNKNOWN_BUILD);
    process.env.NEXT_PUBLIC_BUILD_STAMP = 'abc1234';
    expect(currentBuildStamp()).toBe('abc1234');
  });
});

describe('GET /api/version', () => {
  it('answers with the serving build stamp', async () => {
    process.env.NEXT_PUBLIC_BUILD_STAMP = 'abc1234';
    const res = await versionRoute();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ build: 'abc1234' });
  });
});
