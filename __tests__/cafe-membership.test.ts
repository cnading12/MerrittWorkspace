import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CAFE_MEMBER_LIMIT,
  computeCafeCapacity,
  occupiesCafePlace,
  type CafeCapacityMember,
} from '@/lib/portal/cafeAvailability';
import { FALLBACK_ALLOCATIONS } from '@/lib/bookings/allocations';
import {
  CAFE_MEMBERSHIP_MONTHLY_CENTS,
  DEDICATED_DESK_MONTHLY_CENTS,
  MEMBERSHIP_PLANS,
} from '@/lib/portal/pricing';
import { DESIGNATION_LABELS } from '@/lib/portal/types';

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');

const member = (over: Partial<CafeCapacityMember> = {}): CafeCapacityMember => ({
  id: Math.random().toString(36).slice(2),
  designation: 'cafe_membership',
  status: 'active',
  archived_at: null,
  ...over,
});

describe('the cafe tier is priced and provisioned as half a desk', () => {
  it('costs half what a dedicated desk costs', () => {
    expect(CAFE_MEMBERSHIP_MONTHLY_CENTS).toBe(DEDICATED_DESK_MONTHLY_CENTS / 2);
    expect(CAFE_MEMBERSHIP_MONTHLY_CENTS).toBe(10000);
  });

  it('includes half a dedicated desk’s booking allowance', () => {
    // The whole pitch is "half the price, half the credit, same everything
    // else". If the desk numbers move, these must move with them.
    const desk = FALLBACK_ALLOCATIONS.dedicated_desk;
    const cafe = FALLBACK_ALLOCATIONS.cafe_membership;
    expect(cafe.flexHoursPerWeek).toBe(desk.flexHoursPerWeek / 2);
    expect(cafe.conferenceHoursPerMonth).toBe(desk.conferenceHoursPerMonth / 2);
    expect(cafe).toEqual({ flexHoursPerWeek: 2, conferenceHoursPerMonth: 2 });
  });

  it('is a sellable plan with a label', () => {
    expect(MEMBERSHIP_PLANS.cafe_membership.monthly_cost_cents).toBe(CAFE_MEMBERSHIP_MONTHLY_CENTS);
    expect(MEMBERSHIP_PLANS.cafe_membership.one_time).toBeUndefined();
    expect(DESIGNATION_LABELS.cafe_membership).toBeTruthy();
  });

  it('is priced identically everywhere it is quoted', () => {
    const dollars = CAFE_MEMBERSHIP_MONTHLY_CENTS / 100;
    // The application form and its API price submissions independently of
    // lib/portal/pricing.ts, so a change in one place must not be silent.
    expect(read('app/api/membership-application/route.ts')).toContain(
      `cafe_membership:         { label: 'Café Membership',            price_cents: ${CAFE_MEMBERSHIP_MONTHLY_CENTS}`,
    );
    expect(read('app/membership/apply/page.tsx')).toContain(`price: ${dollars},`);
  });
});

describe('cafe capacity', () => {
  it('caps at fifteen places', () => {
    expect(CAFE_MEMBER_LIMIT).toBe(15);
  });

  it('counts live cafe members and nobody else', () => {
    const capacity = computeCafeCapacity([
      member(),
      member(),
      member({ designation: 'dedicated_desk' }),
      member({ designation: 'private_office_single' }),
    ]);
    expect(capacity.takenCount).toBe(2);
    expect(capacity.remainingCount).toBe(CAFE_MEMBER_LIMIT - 2);
    expect(capacity.isFull).toBe(false);
  });

  it('frees a place only on archive, not on cancellation', () => {
    // A member serving out their notice can still turn up and sit down, so
    // their place is not resellable yet. Mirrors desk capacity.
    expect(occupiesCafePlace(member({ status: 'cancelled' }))).toBe(true);
    expect(occupiesCafePlace(member({ archived_at: '2026-08-01T00:00:00Z' }))).toBe(false);
  });

  it('reports full at exactly the limit', () => {
    const atLimit = computeCafeCapacity(
      Array.from({ length: CAFE_MEMBER_LIMIT }, () => member()),
    );
    expect(atLimit.isFull).toBe(true);
    expect(atLimit.remainingCount).toBe(0);
  });

  it('never reports negative headroom if the cap is exceeded by hand', () => {
    // An admin may make a sixteenth exception; the cap lives in code, not in a
    // database constraint, precisely so they can. The maths must not go
    // negative and render "-1 places left".
    const over = computeCafeCapacity(
      Array.from({ length: CAFE_MEMBER_LIMIT + 3 }, () => member()),
    );
    expect(over.isFull).toBe(true);
    expect(over.remainingCount).toBe(0);
    expect(over.takenCount).toBe(CAFE_MEMBER_LIMIT + 3);
  });

  it('treats an empty building as fully available', () => {
    const empty = computeCafeCapacity([]);
    expect(empty.takenCount).toBe(0);
    expect(empty.remainingCount).toBe(CAFE_MEMBER_LIMIT);
    expect(empty.isFull).toBe(false);
  });
});

describe('the tier is actually reachable', () => {
  it('is offered on the application form and the comparison page', () => {
    expect(read('app/membership/apply/page.tsx')).toContain("id: 'cafe_membership'");
    expect(read('app/membership/(overview)/page.tsx')).toContain("id: 'cafe_membership'");
  });

  it('is gated on the form when the places are gone', () => {
    // A capped tier that keeps taking selections after it fills is how you end
    // up with a sixteenth member who was told yes.
    const form = read('app/membership/apply/page.tsx');
    expect(form).toContain('/api/cafe-availability');
    expect(form).toContain('cafeFull');
  });

  it('is checked server-side too, not only in the browser', () => {
    expect(read('app/api/membership-application/route.ts')).toContain('getCafeCapacity');
  });

  it('is advertised as new, alongside the private dedicated desk', () => {
    const page = read('app/membership/(overview)/page.tsx');
    // Both are new products; the badge is what says so.
    expect(page.match(/isNew: true/g) ?? []).toHaveLength(2);
  });

  it('has a migration that admits the designation', () => {
    const sql = read('supabase/migrations/20260824_cafe_membership.sql');
    expect(sql).toContain("'cafe_membership'");
    // And must not drop the retired day pass, which live rows still carry.
    expect(sql).toContain("'one_day_dedicated_desk'");
  });

  it('seeds the same allowance the code falls back to', () => {
    const sql = read('supabase/migrations/20260824_cafe_membership.sql');
    const { flexHoursPerWeek, conferenceHoursPerMonth } = FALLBACK_ALLOCATIONS.cafe_membership;
    expect(sql).toContain(`('cafe_membership', ${flexHoursPerWeek}, ${conferenceHoursPerMonth},`);
  });
});
