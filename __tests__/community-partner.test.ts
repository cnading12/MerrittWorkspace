import { describe, it, expect, vi, beforeEach } from 'vitest';

// Community partners are non-profits granted comped use of the conference
// room and flex space. They are not members and not office occupants, so the
// two things that must hold are: their hours come from the per-member admin
// overrides rather than a tier, and they are never pooled into an office.

const queryLog: Array<{ table: string; method: string; args: any[] }> = [];
let resultsByTable: Record<string, { data: any[] | null; error: any }> = {};

function chainableQuery(table: string) {
  const q: any = {};
  for (const method of ['select', 'eq', 'neq', 'gte', 'gt', 'lt', 'in', 'not']) {
    q[method] = (...args: any[]) => {
      queryLog.push({ table, method, args });
      return q;
    };
  }
  q.then = (resolve: any) => resolve(resultsByTable[table] ?? { data: [], error: null });
  q.maybeSingle = async () => {
    const res = resultsByTable[table] ?? { data: [], error: null };
    return { data: Array.isArray(res.data) ? res.data[0] ?? null : res.data, error: res.error };
  };
  return q;
}

vi.mock('@/lib/portal/supabaseAdmin', () => ({
  getServiceSupabase: () => ({ from: (table: string) => chainableQuery(table) }),
}));

import { getMemberFlexSummary } from '@/lib/bookings/flex-hours';
import { getMemberHoursSummary } from '@/lib/bookings/conference-hours';
import { getAllocationFor, clearAllocationCache } from '@/lib/bookings/allocations';
import { isOfficePooledDesignation } from '@/lib/bookings/officePool';
import {
  DESIGNATION_LABELS,
  showsHoursOverrides,
  OVERRIDE_ELIGIBLE_DESIGNATIONS,
} from '@/lib/portal/types';
import { MEMBERSHIP_PLANS } from '@/lib/portal/pricing';

const midweek = new Date('2026-08-19T18:00:00Z');

beforeEach(() => {
  queryLog.length = 0;
  resultsByTable = { tier_allocations: { data: [], error: null } };
  clearAllocationCache();
});

describe('the designation itself', () => {
  it('has a member-facing label and costs nothing', () => {
    expect(DESIGNATION_LABELS.community_partner).toBe('Community Partner');
    expect(MEMBERSHIP_PLANS.community_partner.monthly_cost_cents).toBe(0);
  });

  it('is never pooled into an office', () => {
    // The failure this guards: a partner with an office_number set would
    // otherwise draw down a paying member's shared hours.
    expect(isOfficePooledDesignation('community_partner')).toBe(false);
  });

  it('includes nothing by default, so an unconfigured partner pays the normal rate', async () => {
    // Deliberately not unlimited: hours are negotiated per organisation.
    await expect(getAllocationFor('community_partner')).resolves.toEqual({
      flexHoursPerWeek: 0,
      conferenceHoursPerMonth: 0,
    });
  });
});

describe('conference hours come from the override', () => {
  it('grants exactly the override, ignoring the zero tier default', async () => {
    resultsByTable['conference_bookings'] = { data: [], error: null };
    const summary = await getMemberHoursSummary(
      {
        id: 'partner-1',
        designation: 'community_partner',
        office_number: null,
        conference_hours_override: 6,
      },
      '2026-08-05',
    );
    expect(summary).toEqual({ included: 6, used: 0, remaining: 6 });
  });

  it('counts usage against the override', async () => {
    resultsByTable['conference_bookings'] = { data: [{ included_hours: 4 }], error: null };
    const summary = await getMemberHoursSummary(
      {
        id: 'partner-1',
        designation: 'community_partner',
        office_number: null,
        conference_hours_override: 6,
      },
      '2026-08-05',
    );
    expect(summary).toMatchObject({ included: 6, used: 4, remaining: 2 });
  });

  it('falls to the zero tier default when no override is set', async () => {
    resultsByTable['conference_bookings'] = { data: [], error: null };
    const summary = await getMemberHoursSummary(
      { id: 'partner-1', designation: 'community_partner', office_number: null },
      '2026-08-05',
    );
    expect(summary.included).toBe(0);
  });
});

describe('flex hours come from the override', () => {
  it('grants exactly the override, in half-hour precision', async () => {
    const s = await getMemberFlexSummary(
      { id: 'partner-1', designation: 'community_partner', flex_hours_override: 2.5 },
      midweek,
    );
    expect(s.allowedMinutes).toBe(150);
    expect(s.remainingMinutes).toBe(150);
  });

  it('counts usage against the override', async () => {
    resultsByTable['flex_bookings'] = { data: [{ duration_minutes: 60 }], error: null };
    const s = await getMemberFlexSummary(
      { id: 'partner-1', designation: 'community_partner', flex_hours_override: 3 },
      midweek,
    );
    expect(s).toMatchObject({ allowedMinutes: 180, usedMinutes: 60, remainingMinutes: 120 });
  });

  it('stays personal even with an office number set', async () => {
    // The override beats pooling outright — this is the safety net behind the
    // "never pooled" rule above.
    resultsByTable['members'] = {
      data: [
        { id: 'primary', designation: 'private_office_large', status: 'active', office_number: '110', archived_at: null },
        { id: 'partner-1', designation: 'community_partner', status: 'active', office_number: '110', archived_at: null },
      ],
      error: null,
    };
    const s = await getMemberFlexSummary(
      {
        id: 'partner-1',
        designation: 'community_partner',
        office_number: '110',
        flex_hours_override: 2,
      },
      midweek,
    );
    expect(s.pooled).toBeUndefined();
    expect(s.allowedMinutes).toBe(120);
  });

  it('gives no flex time when no override is set', async () => {
    const s = await getMemberFlexSummary(
      { id: 'partner-1', designation: 'community_partner' },
      midweek,
    );
    expect(s.allowedMinutes).toBe(0);
  });

  it('applies an override to an ordinary designation too, without pooling', async () => {
    // The controls are hidden for ordinary members, but a stored value must
    // still be honoured — otherwise it could never be seen or cleared.
    const s = await getMemberFlexSummary(
      {
        id: 'm1',
        designation: 'private_office_large',
        office_number: '110',
        flex_hours_override: 1,
      },
      midweek,
    );
    expect(s.allowedMinutes).toBe(60);
    expect(s.pooled).toBeUndefined();
  });
});

describe('where the admin override controls appear', () => {
  it('shows them for community partners', () => {
    expect(OVERRIDE_ELIGIBLE_DESIGNATIONS).toContain('community_partner');
    expect(showsHoursOverrides({ designation: 'community_partner' })).toBe(true);
  });

  it('hides them for ordinary members', () => {
    expect(showsHoursOverrides({ designation: 'dedicated_desk' })).toBe(false);
    expect(showsHoursOverrides({ designation: 'private_office_large' })).toBe(false);
    expect(showsHoursOverrides({ designation: 'office_member' })).toBe(false);
    expect(showsHoursOverrides({ designation: null })).toBe(false);
  });

  it('still shows them for anyone who already has a value stored', () => {
    // Otherwise an override set earlier becomes invisible and unclearable.
    expect(
      showsHoursOverrides({ designation: 'dedicated_desk', conference_hours_override: 3 }),
    ).toBe(true);
    expect(
      showsHoursOverrides({ designation: 'dedicated_desk', flex_hours_override: 1.5 }),
    ).toBe(true);
  });
});

describe('what paperwork a partner owes', () => {
  it('asks a partner for photo ID only', async () => {
    const { requiredDocTypesFor } = await import('@/lib/portal/types');
    // No lease and no billing address, so proof of address does not apply —
    // requiring it would block them on a document that makes no sense.
    expect(requiredDocTypesFor('community_partner')).toEqual(['photo_id']);
  });

  it('leaves the requirements for everyone else alone', async () => {
    const { requiredDocTypesFor, REQUIRED_DOC_TYPES } = await import('@/lib/portal/types');
    expect(requiredDocTypesFor('dedicated_desk')).toEqual(REQUIRED_DOC_TYPES);
    expect(requiredDocTypesFor('private_office_large')).toEqual(REQUIRED_DOC_TYPES);
    expect(requiredDocTypesFor(null)).toEqual(REQUIRED_DOC_TYPES);
    expect(REQUIRED_DOC_TYPES).toEqual(['photo_id', 'proof_of_address']);
  });
});
