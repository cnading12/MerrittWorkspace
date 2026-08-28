// Which private office is which size.
//
// The building's offices are 100–112, 114 and 120 (see OFFICE_SPACES in
// seating.ts), and they are not all the same room: some hold one desk, some
// two, and a few hold a team of four to eight. We sell them as three tiers —
// private_office_single, _double and _large (lib/portal/pricing.ts) — but
// until now nothing recorded WHICH room belongs to which tier, so the only
// question the code could answer was "how many offices are empty".
//
// That is the question this module upgrades. A prospect choosing an office to
// try wants to know whether a 2-desk office is free, not whether some office
// somewhere is.
//
// The map is deliberately in code rather than in the database, for the same
// reason CAFE_MEMBER_LIMIT is: it is a fact about the floor plan that changes
// when walls or furniture change, not per-row data that staff edit. Editing
// it is one line per office.
//
// An office missing from the map is not an error — it counts toward the
// building total and toward nothing else, so a half-filled map still gives
// correct per-size numbers for the sizes it does know. When the map is empty
// entirely, per-size availability reports as unknown and every caller falls
// back to the plain "N offices free" line it printed before.

import { OFFICE_SPACES, canonicalizeSpaceNumber } from './seating';

export type OfficeSize = 'single' | 'double' | 'large';

export const OFFICE_SIZES: readonly OfficeSize[] = ['single', 'double', 'large'];

/** The plan someone buys when they take an office of this size. */
export const PLAN_FOR_OFFICE_SIZE: Record<OfficeSize, string> = {
  single: 'private_office_single',
  double: 'private_office_double',
  large: 'private_office_large',
};

/** The reverse: which size a private-office plan id refers to. */
export const OFFICE_SIZE_FOR_PLAN: Record<string, OfficeSize> = {
  private_office_single: 'single',
  private_office_double: 'double',
  private_office_large: 'large',
};

// The floor plan itself, keyed by canonical office number. Every office in
// OFFICE_SPACES appears here; an office left out would count toward the
// building total and toward no size bucket.
//
// Two single-desk rooms, five doubles, and eight team rooms — which is why
// "is an office free?" was never a useful answer on its own: the answer for
// a solo professional and the answer for a team of six come from pools of
// two and eight.
export const OFFICE_SIZE_BY_NUMBER: Record<string, OfficeSize> = {
  '106': 'single',
  '108': 'single',

  '100': 'double',
  '101': 'double',
  '102': 'double',
  '105': 'double',
  '107': 'double',

  '103': 'large',
  '104': 'large',
  '109': 'large',
  '110': 'large',
  '111': 'large',
  '112': 'large',
  '114': 'large',
  '120': 'large',
};

/** How many offices have a size recorded. Zero means "we don't know yet". */
export function sizedOfficeCount(sizeMap: Record<string, OfficeSize> = OFFICE_SIZE_BY_NUMBER): number {
  return Object.keys(sizeMap).length;
}

export function officeSizeOf(officeNumber: string | null | undefined): OfficeSize | null {
  const canonical = canonicalizeSpaceNumber('office', officeNumber ?? null);
  if (!canonical) return null;
  return OFFICE_SIZE_BY_NUMBER[canonical] ?? null;
}

export interface OfficeSizeCount {
  /** Offices of this size in the building. */
  capacity: number;
  /** How many of them are empty right now. */
  remaining: number;
  isFull: boolean;
}

export type OfficeSizeAvailability = Record<OfficeSize, OfficeSizeCount>;

/**
 * Split an availability list by office size.
 *
 * Returns null when no office has a size recorded — the caller must then say
 * nothing about per-size availability rather than print three zeroes, which
 * would read as "nothing is available" when it means "we never wrote the
 * floor plan down".
 */
export function summarizeOfficeSizes(
  availableOffices: string[],
  sizeMap: Record<string, OfficeSize> = OFFICE_SIZE_BY_NUMBER
): OfficeSizeAvailability | null {
  if (sizedOfficeCount(sizeMap) === 0) return null;

  const free = new Set(
    availableOffices
      .map((o) => canonicalizeSpaceNumber('office', o))
      .filter((o): o is string => Boolean(o))
  );

  const empty = (): OfficeSizeCount => ({ capacity: 0, remaining: 0, isFull: true });
  const bySize: OfficeSizeAvailability = {
    single: empty(),
    double: empty(),
    large: empty(),
  };

  for (const office of OFFICE_SPACES) {
    const size = sizeMap[office];
    if (!size) continue;
    bySize[size].capacity += 1;
    if (free.has(office)) bySize[size].remaining += 1;
  }
  for (const size of OFFICE_SIZES) {
    bySize[size].isFull = bySize[size].remaining === 0;
  }

  return bySize;
}
