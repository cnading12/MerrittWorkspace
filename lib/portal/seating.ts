// Reference data and merge logic for the admin seating chart.
//
// The building has a fixed set of seats. Dedicated desks are DD1–DD26 (see
// desks.ts, the same range members self-assign in the portal). Private offices
// are numbered 100–112, 114, and a single office 120 in the wellness space
// (office 113 does not exist; 120 is not shown on the floor-plan image but is a
// real, listable office).
//
// Occupancy is built by overlaying two sources onto this fixed set of spaces:
//   1. Portal members  — members.desk_number / members.office_number (read-only
//      here; managed wherever members are normally edited).
//   2. Manual entries  — the seating_manual_assignments table, for people who
//      haven't transitioned to the portal yet (editable/deletable here).
//
// When a portal member and a manual entry both claim the same space we flag a
// conflict rather than silently picking one — the admin needs to resolve it.

import { DD_MIN, DD_MAX, normalizeDeskNumber } from './desks';

export type SpaceType = 'desk' | 'office';

// One manual occupant for a single space. Mirrors the
// seating_manual_assignments table.
export interface ManualAssignment {
  id: string;
  space_type: SpaceType;
  space_number: string;
  occupant_name: string;
  created_at: string;
  updated_at: string;
}

// The minimal shape of a member needed to build occupancy. Keeps this module
// decoupled from the full Member type so it can be unit-tested in isolation.
export interface SeatingMember {
  id: string;
  first_name: string;
  last_name: string;
  desk_number: string | null;
  office_number: string | null;
}

export type OccupancySource = 'portal' | 'manual';

export interface SpaceOccupant {
  name: string;
  source: OccupancySource;
  // Present for portal occupants so the UI can link back to the member page.
  memberId?: string;
  // Present for manual occupants so the UI can edit/delete the row.
  manualId?: string;
}

export interface OccupancyEntry {
  spaceType: SpaceType;
  // Canonical space label, e.g. "DD4" or "101".
  spaceNumber: string;
  // The occupant shown for this space. Vacant spaces have occupant === null.
  // When there's a conflict this is the portal occupant (the source of truth
  // for billing) and `conflict` holds the competing manual entry.
  occupant: SpaceOccupant | null;
  // Set when both a portal member and a manual entry claim this space.
  conflict?: SpaceOccupant;
}

// Canonical desk labels DD1..DD26, in order.
export const DESK_SPACES: string[] = Array.from(
  { length: DD_MAX - DD_MIN + 1 },
  (_, i) => `DD${DD_MIN + i}`
);

// Canonical office labels. 100–112 (contiguous), 114, and the wellness-space
// office 120. Office 113 intentionally omitted — it does not exist.
export const OFFICE_SPACES: string[] = [
  ...Array.from({ length: 13 }, (_, i) => String(100 + i)), // 100..112
  '114',
  '120',
];

// Canonical form used for matching a desk/office number across sources so that
// "dd4", "DD4", and " DD4 " all collide, and office numbers ignore surrounding
// whitespace. Desks use the DD# normalizer; everything else is trimmed and
// uppercased.
export function canonicalizeSpaceNumber(
  spaceType: SpaceType,
  raw: string | null | undefined
): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  if (spaceType === 'desk') {
    const r = normalizeDeskNumber(trimmed);
    return r.ok ? r.value : trimmed.toUpperCase();
  }
  return trimmed.toUpperCase();
}

function fullName(m: SeatingMember): string {
  return `${m.first_name} ${m.last_name}`.trim();
}

// Build the occupancy list for one space type by overlaying portal members and
// manual entries onto the fixed set of spaces. Spaces are returned in canonical
// order; any occupied space whose number isn't in the canonical set (e.g. a
// typo or a legacy office) is appended at the end so nobody is hidden.
export function buildOccupancy(
  spaceType: SpaceType,
  canonicalSpaces: string[],
  members: SeatingMember[],
  manual: ManualAssignment[]
): OccupancyEntry[] {
  // Index portal occupants by canonical space number.
  const portalBySpace = new Map<string, SpaceOccupant>();
  for (const m of members) {
    const raw = spaceType === 'desk' ? m.desk_number : m.office_number;
    const key = canonicalizeSpaceNumber(spaceType, raw);
    if (!key) continue;
    // First writer wins for the primary slot; additional members on the same
    // space are surfaced as conflicts below.
    if (!portalBySpace.has(key)) {
      portalBySpace.set(key, {
        name: fullName(m),
        source: 'portal',
        memberId: m.id,
      });
    }
  }

  // Index manual occupants by canonical space number.
  const manualBySpace = new Map<string, SpaceOccupant>();
  for (const a of manual) {
    if (a.space_type !== spaceType) continue;
    const key = canonicalizeSpaceNumber(spaceType, a.space_number);
    if (!key) continue;
    if (!manualBySpace.has(key)) {
      manualBySpace.set(key, {
        name: a.occupant_name,
        source: 'manual',
        manualId: a.id,
      });
    }
  }

  // Canonical spaces first, in their defined order, then any extra occupied
  // spaces not in the canonical list (appended, sorted for stability).
  const seen = new Set(canonicalSpaces);
  const occupiedKeys = Array.from(portalBySpace.keys()).concat(
    Array.from(manualBySpace.keys())
  );
  const extras = Array.from(new Set(occupiedKeys))
    .filter((k) => !seen.has(k))
    .sort((a, b) => compareSpaceNumbers(spaceType, a, b));

  const order = [...canonicalSpaces, ...extras];

  return order.map((spaceNumber) => {
    const portal = portalBySpace.get(spaceNumber);
    const manualOcc = manualBySpace.get(spaceNumber);

    if (portal && manualOcc) {
      // Both sources claim it — portal is the primary, manual is the conflict.
      return { spaceType, spaceNumber, occupant: portal, conflict: manualOcc };
    }
    return {
      spaceType,
      spaceNumber,
      occupant: portal || manualOcc || null,
    };
  });
}

// Natural ordering for space labels: numeric portion compared as a number,
// then any suffix lexicographically. Used to place non-canonical extras.
function compareSpaceNumbers(spaceType: SpaceType, a: string, b: string): number {
  const am = a.match(/(\d+)/);
  const bm = b.match(/(\d+)/);
  if (am && bm) {
    const diff = parseInt(am[1], 10) - parseInt(bm[1], 10);
    if (diff !== 0) return diff;
  }
  return a.localeCompare(b);
}

// Validate and canonicalize a manual entry before it's saved. Returns the
// canonical space number on success or an error message on failure. Shared by
// the API so client and server agree on what's valid.
export type ManualValidation =
  | { ok: true; spaceType: SpaceType; spaceNumber: string; occupantName: string }
  | { ok: false; error: string };

export function validateManualAssignment(input: {
  space_type?: unknown;
  space_number?: unknown;
  occupant_name?: unknown;
}): ManualValidation {
  const spaceType = input.space_type;
  if (spaceType !== 'desk' && spaceType !== 'office') {
    return { ok: false, error: 'space_type must be "desk" or "office".' };
  }
  const name =
    typeof input.occupant_name === 'string' ? input.occupant_name.trim() : '';
  if (!name) {
    return { ok: false, error: 'A name is required.' };
  }
  if (name.length > 120) {
    return { ok: false, error: 'Name is too long.' };
  }
  const rawNumber =
    typeof input.space_number === 'string' ? input.space_number.trim() : '';
  if (!rawNumber) {
    return { ok: false, error: 'A space number is required.' };
  }

  if (spaceType === 'desk') {
    const r = normalizeDeskNumber(rawNumber);
    if (!r.ok) return { ok: false, error: r.error };
    return { ok: true, spaceType, spaceNumber: r.value, occupantName: name };
  }

  // Offices: accept the canonical list plus any extra number the admin enters
  // (free-text, like the member office field), capped to match the portal's
  // 32-char limit.
  const canonical = rawNumber.toUpperCase().slice(0, 32);
  return { ok: true, spaceType, spaceNumber: canonical, occupantName: name };
}
