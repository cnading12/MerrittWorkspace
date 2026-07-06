import { describe, it, expect } from 'vitest';
import {
  buildDuesSummary,
  formatUsd,
  type DuesMemberRow,
  type DuesPaymentRow,
} from '@/lib/portal/duesSummary';
import { monthlyDuesSummaryEmail } from '@/lib/portal/emails';

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
