import { describe, it, expect } from 'vitest';
import {
  MEMBERSHIP_PLANS,
  planForMembershipType,
  isOneTimeDesignation,
  DEDICATED_DESK_MONTHLY_CENTS,
  PRIVATE_DEDICATED_DESK_MONTHLY_CENTS,
} from '@/lib/portal/pricing';
import { DESIGNATION_LABELS, OFFICE_DESIGNATIONS, PRIMARY_OFFICE_DESIGNATIONS } from '@/lib/portal/types';
import { monthlyIncludedHours, isOfficePooledDesignation } from '@/lib/bookings/conference-hours';

// The private dedicated desk: a desk inside a private office we've converted
// into a dedicated-desk area, sold once all 25 desks on the shared floor are
// spoken for. It costs more than a floor desk because the space is private and
// lockable, and it is otherwise the same product.

describe('private dedicated desk pricing', () => {
  it('costs $300/mo against the shared floor desk at $200/mo', () => {
    expect(DEDICATED_DESK_MONTHLY_CENTS).toBe(20000);
    expect(PRIVATE_DEDICATED_DESK_MONTHLY_CENTS).toBe(30000);
  });

  it('resolves to its own designation and rate when an application is approved', () => {
    const plan = planForMembershipType('private_dedicated_desk');
    expect(plan).not.toBeNull();
    expect(plan!.designation).toBe('private_dedicated_desk');
    expect(plan!.monthly_cost_cents).toBe(PRIVATE_DEDICATED_DESK_MONTHLY_CENTS);
  });

  it('bills monthly, not as a one-time charge', () => {
    expect(MEMBERSHIP_PLANS.private_dedicated_desk.one_time).toBeUndefined();
    expect(isOneTimeDesignation('private_dedicated_desk')).toBe(false);
  });

  it('leaves the shared dedicated desk rate alone', () => {
    expect(planForMembershipType('dedicated_desk')!.monthly_cost_cents).toBe(
      DEDICATED_DESK_MONTHLY_CENTS,
    );
  });
});

describe('private dedicated desk membership rules', () => {
  it('has a member-facing label', () => {
    expect(DESIGNATION_LABELS.private_dedicated_desk).toBe('Private Dedicated Desk');
  });

  it('gets the same conference-room allotment as a shared dedicated desk', () => {
    expect(monthlyIncludedHours('private_dedicated_desk')).toBe(
      monthlyIncludedHours('dedicated_desk'),
    );
  });

  it('keeps a personal hours allotment rather than pooling with the office', () => {
    // Several private-desk members can share one converted office. Pooling
    // would make them compete for a single office allotment.
    expect(isOfficePooledDesignation('private_dedicated_desk')).toBe(false);
    expect(OFFICE_DESIGNATIONS).not.toContain('private_dedicated_desk');
    // They pay for a desk, not the room, so they never anchor an office.
    expect(PRIMARY_OFFICE_DESIGNATIONS).not.toContain('private_dedicated_desk');
  });
});
