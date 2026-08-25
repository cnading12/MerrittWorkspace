// Regression tests for the fixes made in the security audit.
//
// Each block below pins the behaviour that closed a specific hole, so a
// future refactor that reintroduces it fails here rather than in production.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  conferenceAmountCents,
  ConferenceCheckoutError,
} from '@/lib/bookings/conferenceCheckout';
import { HOURLY_RATE_CENTS } from '@/lib/bookings/conference-hours';
import { validateUpload, UploadValidationError } from '@/lib/portal/uploads';
import { checkRateLimit, getClientIp, __resetRateLimits } from '@/lib/rateLimit';
import { priceCart } from '@/lib/snackshop/products';

// Minimal File stand-in: validateUpload only reads `size` and `type`.
function fakeFile(size: number, type: string): File {
  return { size, type, name: 'upload' } as unknown as File;
}

describe('conference checkout pricing is server-authoritative', () => {
  it('prices from the published hourly rate, not a caller-supplied total', () => {
    expect(conferenceAmountCents(1)).toBe(HOURLY_RATE_CENTS);
    expect(conferenceAmountCents(2)).toBe(HOURLY_RATE_CENTS * 2);
    expect(conferenceAmountCents(4)).toBe(HOURLY_RATE_CENTS * 4);
  });

  it('supports quarter-hour granularity without fractional cents', () => {
    const cents = conferenceAmountCents(1.5);
    expect(cents).toBe(Math.round(1.5 * HOURLY_RATE_CENTS));
    expect(Number.isInteger(cents)).toBe(true);
  });

  // The original bug: total_amount came straight off the request body, so a
  // four-hour room could be checked out for a penny.
  it.each([0, -1, -0.01])('rejects a non-positive duration (%s)', (hours) => {
    expect(() => conferenceAmountCents(hours)).toThrow(ConferenceCheckoutError);
  });

  it.each([NaN, Infinity, 'oops' as unknown as number, null as unknown as number])(
    'rejects a non-finite duration (%s)',
    (hours) => {
      expect(() => conferenceAmountCents(hours)).toThrow(ConferenceCheckoutError);
    }
  );

  it('rejects an implausibly long booking', () => {
    expect(() => conferenceAmountCents(13)).toThrow(ConferenceCheckoutError);
    expect(() => conferenceAmountCents(10_000)).toThrow(ConferenceCheckoutError);
  });
});

describe('snackshop cart pricing ignores client-supplied prices', () => {
  it('recomputes the price from the catalog even when the client lies', () => {
    // A tampered payload claiming a $0.01 Celsius still prices at catalog rate.
    const priced = priceCart([{ id: '1', quantity: 2, price: 0.01, name: 'free stuff' } as any]);
    expect(priced.items[0].price).toBe(2.5);
    expect(priced.totalCents).toBe(500);
  });

  it('rejects unknown product ids', () => {
    expect(() => priceCart([{ id: 'not-a-product', quantity: 1 }])).toThrow();
  });

  it.each([0, -1, 1.5, 100])('rejects an invalid quantity (%s)', (quantity) => {
    expect(() => priceCart([{ id: '1', quantity }])).toThrow();
  });
});

describe('upload validation', () => {
  it('accepts the document types members actually submit', () => {
    expect(validateUpload(fakeFile(1024, 'image/jpeg')).extension).toBe('jpg');
    expect(validateUpload(fakeFile(1024, 'application/pdf')).extension).toBe('pdf');
    expect(validateUpload(fakeFile(1024, 'image/png')).extension).toBe('png');
  });

  it('normalises a content type that carries parameters', () => {
    expect(validateUpload(fakeFile(1024, 'image/jpeg; charset=binary')).contentType).toBe(
      'image/jpeg'
    );
  });

  // The stored content type used to be whatever the browser claimed, so an
  // .html or script-bearing .svg would render when staff opened it.
  it.each(['text/html', 'image/svg+xml', 'application/javascript', ''])(
    'rejects a renderable/executable type (%s)',
    (type) => {
      expect(() => validateUpload(fakeFile(1024, type))).toThrow(UploadValidationError);
    }
  );

  it('rejects an oversized file', () => {
    expect(() => validateUpload(fakeFile(11 * 1024 * 1024, 'image/jpeg'))).toThrow(
      UploadValidationError
    );
  });

  it('rejects an empty file', () => {
    expect(() => validateUpload(fakeFile(0, 'image/jpeg'))).toThrow(UploadValidationError);
  });

  it('derives the extension from the type, not the filename', () => {
    const f = { size: 10, type: 'image/png', name: 'evil.html' } as unknown as File;
    expect(validateUpload(f).extension).toBe('png');
  });
});

describe('rate limiter', () => {
  beforeEach(() => __resetRateLimits());

  it('allows up to the limit then blocks', () => {
    const rule = { windowMs: 60_000, max: 3 };
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit('k', rule).limited).toBe(false);
    }
    const blocked = checkRateLimit('k', rule);
    expect(blocked.limited).toBe(true);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks keys independently', () => {
    const rule = { windowMs: 60_000, max: 1 };
    expect(checkRateLimit('a', rule).limited).toBe(false);
    expect(checkRateLimit('b', rule).limited).toBe(false);
    expect(checkRateLimit('a', rule).limited).toBe(true);
  });

  it('takes the left-most x-forwarded-for entry', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '203.0.113.5, 70.41.3.18' },
    });
    expect(getClientIp(req)).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip, then a shared bucket', () => {
    expect(
      getClientIp(new Request('https://example.com', { headers: { 'x-real-ip': '198.51.100.7' } }))
    ).toBe('198.51.100.7');
    expect(getClientIp(new Request('https://example.com'))).toBe('unknown');
  });
});
