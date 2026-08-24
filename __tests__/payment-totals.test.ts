import { describe, it, expect } from 'vitest';
import {
  billingCycleAnchorAfter,
  calculateFeeAgreementTotals,
  calculateProratedFirstMonthCents,
  parseStartDate,
  renderFeeAgreementText,
} from '@/lib/portal/legal';

// These tests guard the contract between three places that all need to
// agree on the same numbers:
//   1. The signed Fee Agreement (calculateFeeAgreementTotals).
//   2. The amount charged at Stripe Checkout
//      (app/api/portal/create-subscription/route.ts).
//   3. The breakdown rendered on the portal Payments tab
//      (app/portal/page.tsx PaymentsTab).
// If any of those drifts, the member sees a different total than they
// signed off on, which is exactly what we are preventing.

describe('calculateProratedFirstMonthCents', () => {
  it('is the full month when the start date is the 1st', () => {
    const may1 = parseStartDate('2026-05-01');
    expect(calculateProratedFirstMonthCents(10000, may1)).toBe(10000);
  });

  it('counts the start day as billable (last day of month → 1 day)', () => {
    // 31 days in May; starting on the 31st → 1/31 of the month.
    const may31 = parseStartDate('2026-05-31');
    // 10000 * 1 / 31 = 322.58 → rounds to 323.
    expect(calculateProratedFirstMonthCents(10000, may31)).toBe(323);
  });

  it('produces an exact mid-month proration', () => {
    // 30 days in June; starting on the 16th → 15 days remaining (16..30).
    const june16 = parseStartDate('2026-06-16');
    expect(calculateProratedFirstMonthCents(10000, june16)).toBe(5000);
  });
});

describe('calculateFeeAgreementTotals', () => {
  it('adds first month + deposit and 3.5% card fee on the subtotal', () => {
    const may15 = parseStartDate('2026-05-15');
    const prorated = calculateProratedFirstMonthCents(10000, may15);
    const totals = calculateFeeAgreementTotals(10000, 'card', false, prorated);

    // 31 days in May, starting on the 15th → 17/31 of $100.
    expect(prorated).toBe(Math.round((10000 * 17) / 31));
    expect(totals.firstMonthCents).toBe(prorated);
    expect(totals.lastMonthCents).toBe(10000);
    expect(totals.subtotalCents).toBe(prorated + 10000);
    expect(totals.ccFeeCents).toBe(Math.round((prorated + 10000) * 0.035));
    expect(totals.grandTotalCents).toBe(totals.subtotalCents + totals.ccFeeCents);
  });

  it('omits the CC fee when paying by ACH', () => {
    const totals = calculateFeeAgreementTotals(10000, 'ach', false, 5000);
    expect(totals.ccFeeCents).toBe(0);
    expect(totals.grandTotalCents).toBe(5000 + 10000);
  });

  it('one-time day pass: no deposit, full price, optional card fee', () => {
    const card = calculateFeeAgreementTotals(3000, 'card', true);
    expect(card.firstMonthCents).toBe(3000);
    expect(card.lastMonthCents).toBe(0);
    expect(card.ccFeeCents).toBe(Math.round(3000 * 0.035));
    expect(card.grandTotalCents).toBe(3000 + card.ccFeeCents);

    const ach = calculateFeeAgreementTotals(3000, 'ach', true);
    expect(ach.ccFeeCents).toBe(0);
    expect(ach.grandTotalCents).toBe(3000);
  });

  it('matches Stripe Checkout math for a card-paying recurring member', () => {
    // Mirrors app/api/portal/create-subscription/route.ts so that the
    // amount we charge equals the Grand Total the member signed.
    const start = parseStartDate('2026-05-15');
    const prorated = calculateProratedFirstMonthCents(10000, start);
    const lastMonthDepositCents = 10000;
    const ccFeeCents = Math.round((prorated + lastMonthDepositCents) * 0.035);
    const checkoutTotal = prorated + lastMonthDepositCents + ccFeeCents;

    const totals = calculateFeeAgreementTotals(10000, 'card', false, prorated);
    expect(checkoutTotal).toBe(totals.grandTotalCents);
  });
});

describe('billingCycleAnchorAfter', () => {
  it('anchors to noon UTC on the 1st of the month after the start date', () => {
    const may15 = parseStartDate('2026-05-15');
    const anchor = billingCycleAnchorAfter(may15);
    // Expect 2026-06-01 12:00:00 UTC.
    expect(anchor).toBe(Math.floor(Date.UTC(2026, 5, 1, 12, 0, 0) / 1000));
    const d = new Date(anchor * 1000);
    expect(d.getUTCMonth()).toBe(5); // June
    expect(d.getUTCDate()).toBe(1);
    expect(d.getUTCFullYear()).toBe(2026);
  });

  it('rolls into next year when the start month is December', () => {
    const dec10 = parseStartDate('2026-12-10');
    const anchor = billingCycleAnchorAfter(dec10);
    const d = new Date(anchor * 1000);
    expect(d.getUTCFullYear()).toBe(2027);
    expect(d.getUTCMonth()).toBe(0); // January
    expect(d.getUTCDate()).toBe(1);
  });

  it('still lands on the 1st when start is already the 1st', () => {
    const may1 = parseStartDate('2026-05-01');
    const anchor = billingCycleAnchorAfter(may1);
    const d = new Date(anchor * 1000);
    // Start = May 1; anchor = June 1 (the *next* full-month charge).
    expect(d.getUTCMonth()).toBe(5);
    expect(d.getUTCDate()).toBe(1);
  });
});

// Existing members who migrated into the portal (`is_legacy_member`) are
// charged nothing at signup — no prorated first month, no last-month
// deposit, no card fee. Their archived Fee Agreement has to say that. It
// used to render through the standard template, which showed a first + last
// deposit Grand Total they never agreed to and were never charged.
describe('renderFeeAgreementText — existing (legacy) member', () => {
  const baseCtx = {
    member: {
      name: 'Dana Reyes',
      street: '2246 Irving St',
      cityStateZip: 'Denver, CO 80211',
      phone: '303-555-0142',
      email: 'dana@example.com',
    },
    invoicing: {
      companyName: '',
      street: '',
      cityStateZip: '',
      contactName: 'Dana Reyes',
      phone: '',
      email: '',
    },
    designationLabel: 'Dedicated Desk',
    monthlyCostCents: 32500,
    termStart: 'June 1, 2026',
    termEnd: 'June 30, 2026',
    paymentMethod: 'card' as const,
    signedDate: '5/20/2026',
    memberTitle: 'Owner',
  };

  it('collects nothing at signing and names no deposit amount', () => {
    const text = renderFeeAgreementText({
      ...baseCtx,
      legacy: true,
      nextBillingCycleIso: '2026-06-01',
    });

    expect(text).toContain('Existing Member Rate Acknowledgement');
    expect(text).toContain('DUE AT SIGNING');
    expect(text).toContain('$0.00');
    expect(text).toContain('not collected — existing member');
    // The monthly rate is the only dollar figure they committed to.
    expect(text).toContain('$325.00 / month');

    // No prorated first month, no deposit charge, no card fee — the three
    // amounts the standard template would have invented for them.
    expect(text).not.toContain('First Months Membership Fee (prorated)');
    expect(text).not.toContain('3.5% Credit Card Fee');
    expect(text).not.toContain('GRAND TOTAL');
    // $325.00 appears as the monthly rate; it must never appear as a
    // last-month deposit line item.
    expect(text).not.toMatch(/Last Months Membership Fee \(deposit\):\s+\$\d/);
  });

  it('states when auto-pay would begin, and omits the date if unknown', () => {
    const withDate = renderFeeAgreementText({
      ...baseCtx,
      legacy: true,
      nextBillingCycleIso: '2026-06-01',
    });
    expect(withDate).toContain('June 1, 2026');

    // Older legacy agreements may predate `next_billing_cycle`; a malformed
    // or missing value must degrade to the generic sentence, not throw.
    for (const iso of [null, undefined, 'not-a-date']) {
      const without = renderFeeAgreementText({
        ...baseCtx,
        legacy: true,
        nextBillingCycleIso: iso as any,
      });
      expect(without).toContain('the 1st of the next billing cycle');
      expect(without).not.toContain('June 1, 2026');
    }
  });

  it('does not describe a deposit that can be applied or forfeited', () => {
    const text = renderFeeAgreementText({
      ...baseCtx,
      legacy: true,
      nextBillingCycleIso: '2026-06-01',
    });
    // The standard cancellation acknowledgment says the last month's fee is
    // "collected at sign-up and held as a deposit" — untrue here.
    expect(text).not.toContain('collected at sign-up');
    expect(text).toContain('no deposit to be applied');
    // The 30-day notice requirement still stands.
    expect(text).toContain('thirty (30) calendar days');
  });

  it('still renders first + last for a standard (non-legacy) member', () => {
    const text = renderFeeAgreementText({ ...baseCtx, legacy: false });
    const totals = calculateFeeAgreementTotals(32500, 'card', false);

    expect(text).toContain('First Months Membership Fee (prorated)');
    expect(text).toContain('Last Months Membership Fee');
    expect(text).toContain('GRAND TOTAL');
    expect(text).toContain(`$${(totals.grandTotalCents / 100).toFixed(2)}`);
    expect(text).not.toContain('Existing Member Rate Acknowledgement');
  });
});
