import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// tier_allocations makes the per-designation allowances editable without a
// deploy. The behavior that matters most is the FALLBACK: if the table is
// missing or the query fails, members must keep the allowances they pay for
// rather than dropping to zero and flooding the support inbox.

let tableResult: { data: any[] | null; error: any } = { data: [], error: null };
let selectCalls = 0;

vi.mock('@/lib/portal/supabaseAdmin', () => ({
  getServiceSupabase: () => ({
    from: (_table: string) => ({
      select: async () => {
        selectCalls++;
        return tableResult;
      },
    }),
  }),
}));

import {
  getAllocations,
  getAllocationFor,
  flexHoursPerWeek,
  conferenceHoursPerMonth,
  fallbackConferenceHours,
  clearAllocationCache,
  FALLBACK_ALLOCATIONS,
  NO_ALLOCATION,
} from '@/lib/bookings/allocations';

beforeEach(() => {
  tableResult = { data: [], error: null };
  selectCalls = 0;
  clearAllocationCache();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  clearAllocationCache();
});

describe('fallbacks', () => {
  it('serves the built-in numbers when the table is empty', async () => {
    expect(await conferenceHoursPerMonth('dedicated_desk')).toBe(4);
    expect(await flexHoursPerWeek('private_office_large')).toBe(8);
  });

  it('serves the built-in numbers when the query fails outright', async () => {
    tableResult = { data: null, error: { message: 'relation does not exist' } };
    // The migration not being applied yet must not lock anyone out.
    expect(await conferenceHoursPerMonth('private_office_single')).toBe(14);
    expect(await flexHoursPerWeek('dedicated_desk')).toBe(4);
  });

  it('treats single and double offices identically', async () => {
    expect(await getAllocationFor('private_office_single')).toEqual(
      await getAllocationFor('private_office_double'),
    );
  });

  it('gives a private dedicated desk the same allowance as a shared one', async () => {
    expect(await getAllocationFor('private_dedicated_desk')).toEqual(
      await getAllocationFor('dedicated_desk'),
    );
  });

  it('gives a day pass no flex access and no monthly conference hours', async () => {
    expect(await getAllocationFor('one_day_dedicated_desk')).toEqual({
      flexHoursPerWeek: 0,
      conferenceHoursPerMonth: 0,
    });
  });

  it('gives retired and unknown designations nothing', async () => {
    // 'flex' and 'other' were left out of tier_allocations deliberately.
    expect(await getAllocationFor('flex')).toEqual(NO_ALLOCATION);
    expect(await getAllocationFor('other')).toEqual(NO_ALLOCATION);
    expect(await getAllocationFor('mystery')).toEqual(NO_ALLOCATION);
    expect(await getAllocationFor(null)).toEqual(NO_ALLOCATION);
  });
});

describe('table values', () => {
  it('overrides the built-in numbers', async () => {
    tableResult = {
      data: [
        {
          designation: 'dedicated_desk',
          flex_hours_per_week: 9,
          conference_hours_per_month: 11,
        },
      ],
      error: null,
    };
    expect(await getAllocationFor('dedicated_desk')).toEqual({
      flexHoursPerWeek: 9,
      conferenceHoursPerMonth: 11,
    });
  });

  it('accepts zero as a real value rather than falling back', async () => {
    tableResult = {
      data: [
        {
          designation: 'dedicated_desk',
          flex_hours_per_week: 0,
          conference_hours_per_month: 0,
        },
      ],
      error: null,
    };
    expect(await getAllocationFor('dedicated_desk')).toEqual({
      flexHoursPerWeek: 0,
      conferenceHoursPerMonth: 0,
    });
  });

  it('accepts fractional hours', async () => {
    tableResult = {
      data: [
        {
          designation: 'dedicated_desk',
          flex_hours_per_week: '2.5',
          conference_hours_per_month: '1.5',
        },
      ],
      error: null,
    };
    expect(await getAllocationFor('dedicated_desk')).toEqual({
      flexHoursPerWeek: 2.5,
      conferenceHoursPerMonth: 1.5,
    });
  });

  it('falls back per-field on a malformed or negative value', async () => {
    tableResult = {
      data: [
        {
          designation: 'dedicated_desk',
          flex_hours_per_week: 'not a number',
          conference_hours_per_month: -3,
        },
      ],
      error: null,
    };
    // One bad column must not poison the other, nor the rest of the map.
    expect(await getAllocationFor('dedicated_desk')).toEqual(
      FALLBACK_ALLOCATIONS.dedicated_desk,
    );
    expect(await conferenceHoursPerMonth('private_office_large')).toBe(20);
  });

  it('ignores a row with no usable designation', async () => {
    tableResult = {
      data: [
        { designation: null, flex_hours_per_week: 99, conference_hours_per_month: 99 },
        { designation: '', flex_hours_per_week: 99, conference_hours_per_month: 99 },
      ],
      error: null,
    };
    const all = await getAllocations();
    expect(all).toEqual(FALLBACK_ALLOCATIONS);
  });

  it('carries a designation that has a row but no built-in fallback', async () => {
    tableResult = {
      data: [
        {
          designation: 'brand_new_tier',
          flex_hours_per_week: 3,
          conference_hours_per_month: 7,
        },
      ],
      error: null,
    };
    expect(await getAllocationFor('brand_new_tier')).toEqual({
      flexHoursPerWeek: 3,
      conferenceHoursPerMonth: 7,
    });
  });
});

describe('caching', () => {
  it('reads the table once and serves later lookups from memory', async () => {
    await getAllocations();
    await getAllocations();
    await conferenceHoursPerMonth('dedicated_desk');
    expect(selectCalls).toBe(1);
  });

  it('re-reads after the cache is cleared', async () => {
    await getAllocations();
    clearAllocationCache();
    await getAllocations();
    expect(selectCalls).toBe(2);
  });
});

describe('fallbackConferenceHours (synchronous)', () => {
  it('matches the async lookup when the table is empty', async () => {
    expect(fallbackConferenceHours('dedicated_desk')).toBe(4);
    expect(fallbackConferenceHours('private_office_double')).toBe(14);
    expect(fallbackConferenceHours('mystery')).toBe(0);
    expect(fallbackConferenceHours(null)).toBe(0);
    expect(fallbackConferenceHours('private_office_large')).toBe(
      await conferenceHoursPerMonth('private_office_large'),
    );
  });
});

describe('the migration seed and the built-in fallbacks agree', () => {
  // FALLBACK_ALLOCATIONS is what runs when the table can't be read, so it has
  // to mirror what the migration seeds. Nothing else keeps them in step, and
  // silent drift would mean a database outage quietly changes everyone's
  // allowance instead of preserving it.
  it('seeds every fallback designation with the same numbers', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    // Read EVERY migration that touches tier_allocations, not just the one
    // that created the table: a tier added later is seeded in its own
    // migration, and pinning this to a single file would make the invariant
    // silently stop covering new tiers the moment one is added.
    const dir = new URL('../supabase/migrations/', import.meta.url);
    const sql = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => readFileSync(new URL(f, dir), 'utf8'))
      .filter((text) => text.includes('tier_allocations'))
      .join('\n');

    const seeded: Record<string, { flex: number; conference: number }> = {};
    // Seed rows look like: ('dedicated_desk', 4, 4, 'note').
    const rowRe = /\(\s*'([a-z_]+)'\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,/g;
    let m: RegExpExecArray | null;
    while ((m = rowRe.exec(sql)) !== null) {
      seeded[m[1]] = { flex: Number(m[2]), conference: Number(m[3]) };
    }

    expect(Object.keys(seeded).sort()).toEqual(
      Object.keys(FALLBACK_ALLOCATIONS).sort(),
    );
    for (const [designation, allocation] of Object.entries(FALLBACK_ALLOCATIONS)) {
      expect(seeded[designation]).toEqual({
        flex: allocation.flexHoursPerWeek,
        conference: allocation.conferenceHoursPerMonth,
      });
    }
  });
});
