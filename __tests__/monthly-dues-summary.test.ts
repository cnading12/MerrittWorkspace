import { describe, it, expect } from 'vitest';
import {
  buildDuesSummary,
  formatUsd,
  resolveReportMonth,
  type DuesMemberRow,
  type DuesPaymentRow,
} from '@/lib/portal/duesSummary';
import {
  monthlyDuesSummaryEmail,
  monthlyDuesSummaryFailureEmail,
} from '@/lib/portal/emails';

// These tests guard the staff-facing monthly dues report
// (app/api/cron/monthly-dues-summary): every charge must land in exactly
// one bucket, failures must never be dropped, and members we expected to
// charge but didn't must be flagged.

const member = (
  id: string,
  first: string,
  last: string,
  costCents: number | null = 50000
): DuesMemberRow => ({
  id,
  first_name: first,
  last_name: last,
  email: `${first.toLowerCase()}@example.com`,
  monthly_cost_cents: costCents,
});

const row = (
  memberId: string | null,
  status: string,
  amountCents = 50000
): DuesPaymentRow => ({
  member_id: memberId,
  amount_cents: amountCents,
  status,
  description: 'Monthly membership',
  paid_at: status === 'succeeded' ? '2026-07-01T15:00:00Z' : null,
  created_at: '2026-07-01T14:00:00Z',
});

describe('buildDuesSummary', () => {
  const alice = member('a', 'Alice', 'Anders');
  const bob = member('b', 'Bob', 'Baker');
  const cara = member('c', 'Cara', 'Cruz');
  const membersById = new Map([
    ['a', alice],
    ['b', bob],
    ['c', cara],
  ]);

  it('buckets rows by status and totals only successful payments', () => {
    const summary = buildDuesSummary({
      rows: [
        row('a', 'succeeded', 50000),
        row('b', 'failed', 65000),
        row('c', 'pending', 40000),
      ],
      membersById,
      expectedMembers: [alice, bob, cara],
    });
    expect(summary.paid.map((e) => e.memberName)).toEqual(['Alice Anders']);
    expect(summary.failed.map((e) => e.memberName)).toEqual(['Bob Baker']);
    expect(summary.pending.map((e) => e.memberName)).toEqual(['Cara Cruz']);
    expect(summary.totalCollectedCents).toBe(50000);
    // Everyone had a charge recorded — nothing missing.
    expect(summary.noCharge).toEqual([]);
  });

  it('flags expected members with no charge recorded, including expected amount', () => {
    const summary = buildDuesSummary({
      rows: [row('a', 'succeeded')],
      membersById,
      expectedMembers: [alice, bob, cara],
    });
    expect(summary.noCharge.map((m) => m.memberName)).toEqual([
      'Bob Baker',
      'Cara Cruz',
    ]);
    expect(summary.noCharge[0].expectedAmountCents).toBe(50000);
  });

  it('a failed charge still counts as "charged" for the missing-charge check', () => {
    // Bob's charge failed — he belongs in `failed`, not `noCharge`.
    const summary = buildDuesSummary({
      rows: [row('b', 'failed')],
      membersById,
      expectedMembers: [bob],
    });
    expect(summary.failed).toHaveLength(1);
    expect(summary.noCharge).toEqual([]);
  });

  it('routes unknown statuses to pending rather than dropping them', () => {
    const summary = buildDuesSummary({
      rows: [row('a', 'disputed')],
      membersById,
      expectedMembers: [alice],
    });
    expect(summary.pending).toHaveLength(1);
    expect(summary.paid).toHaveLength(0);
    expect(summary.failed).toHaveLength(0);
  });

  it('labels rows with no matching member as Unknown member', () => {
    const summary = buildDuesSummary({
      rows: [row(null, 'succeeded'), row('ghost', 'failed')],
      membersById,
      expectedMembers: [],
    });
    expect(summary.paid[0].memberName).toBe('Unknown member');
    expect(summary.failed[0].memberName).toBe('Unknown member');
  });
});

describe('monthlyDuesSummaryEmail', () => {
  const paidEntry = {
    memberName: 'Alice Anders',
    email: 'alice@example.com',
    amount: '500.00',
    description: 'Monthly membership',
    date: 'July 1, 2026',
  };
  const failedEntry = {
    memberName: 'Bob Baker',
    email: 'bob@example.com',
    amount: '650.00',
    description: 'Monthly membership',
    date: 'July 1, 2026',
  };

  it('flags problems in the subject when payments failed or are missing', () => {
    const email = monthlyDuesSummaryEmail({
      monthLabel: 'July 2026',
      totalCollected: '500.00',
      paid: [paidEntry],
      failed: [failedEntry],
      pending: [],
      refunded: [],
      noCharge: [
        { memberName: 'Cara Cruz', email: 'cara@example.com', expectedAmount: '400.00' },
      ],
    });
    expect(email.subject).toContain('⚠️');
    expect(email.subject).toContain('1 failed');
    expect(email.subject).toContain('1 missing');
    // Failure details must appear in both bodies.
    expect(email.html).toContain('Bob Baker');
    expect(email.html).toContain('action required');
    expect(email.text).toContain('FAILED PAYMENTS — ACTION REQUIRED');
    expect(email.text).toContain('Cara Cruz');
  });

  it('reports a clean month without the warning subject', () => {
    const email = monthlyDuesSummaryEmail({
      monthLabel: 'July 2026',
      totalCollected: '500.00',
      paid: [paidEntry],
      failed: [],
      pending: [],
      refunded: [],
      noCharge: [],
    });
    expect(email.subject).not.toContain('⚠️');
    expect(email.subject).toContain('$500.00 collected');
    expect(email.html).toContain('No failed payments this month');
    expect(email.html).toContain('Alice Anders');
  });
});

describe('formatUsd', () => {
  it('formats cents with thousands separators and two decimals', () => {
    expect(formatUsd(50000)).toBe('500.00');
    expect(formatUsd(123456789)).toBe('1,234,567.89');
    expect(formatUsd(0)).toBe('0.00');
  });
});

// The report month is what makes a missed send recoverable: the cron run on
// the 7th reports the month it lands in, and `?month=YYYY-MM` re-runs one
// whose report never arrived.
describe('resolveReportMonth', () => {
  it('reports the current Denver month when none is asked for', () => {
    // 2026-08-07 16:00 UTC — when Vercel Cron fires the job.
    const m = resolveReportMonth({ now: new Date('2026-08-07T16:00:00Z') });
    expect(m.year).toBe(2026);
    expect(m.month).toBe(8);
    expect(m.label).toBe('August 2026');
  });

  it('uses the Denver date, not the UTC one, to pick the month', () => {
    // 2026-09-01 02:00 UTC is still 2026-08-31 20:00 in Denver, so a run
    // that late belongs to August.
    const m = resolveReportMonth({ now: new Date('2026-09-01T02:00:00Z') });
    expect(m.label).toBe('August 2026');
  });

  it('re-runs an explicit past month', () => {
    const m = resolveReportMonth({
      now: new Date('2026-08-26T18:00:00Z'),
      month: '2026-08',
    });
    expect(m.label).toBe('August 2026');
    expect(m.startIso).toBe('2026-08-01T00:00:00.000Z');
    expect(m.endIso).toBe('2026-09-01T00:00:00.000Z');
  });

  it('rolls the end bound into the next year for December', () => {
    const m = resolveReportMonth({ month: '2026-12' });
    expect(m.label).toBe('December 2026');
    expect(m.startIso).toBe('2026-12-01T00:00:00.000Z');
    expect(m.endIso).toBe('2027-01-01T00:00:00.000Z');
  });

  it('tiles consecutive months with no gap and no overlap', () => {
    // A charge can never fall in both months, or in neither.
    const july = resolveReportMonth({ month: '2026-07' });
    const august = resolveReportMonth({ month: '2026-08' });
    expect(july.endIso).toBe(august.startIso);
  });

  it('rejects a malformed month instead of guessing', () => {
    expect(() => resolveReportMonth({ month: 'August' })).toThrow(/YYYY-MM/);
    expect(() => resolveReportMonth({ month: '2026-8' })).toThrow(/YYYY-MM/);
    expect(() => resolveReportMonth({ month: '2026-13' })).toThrow(/01-12/);
  });
});

// A failed run used to look exactly like a month nobody read their mail.
describe('monthlyDuesSummaryFailureEmail', () => {
  const email = monthlyDuesSummaryFailureEmail({
    monthLabel: 'August 2026',
    errorMessage: 'Resend error: domain not verified',
    ranAtLabel: 'August 7, 2026, 10:00 AM MDT',
  });

  it('names the month and flags the failure in the subject', () => {
    expect(email.subject).toContain('FAILED');
    expect(email.subject).toContain('August 2026');
  });

  it('carries the underlying error and the way to re-run it', () => {
    for (const body of [email.html, email.text]) {
      expect(body).toContain('domain not verified');
      expect(body).toContain('?month=YYYY-MM');
    }
  });
});
