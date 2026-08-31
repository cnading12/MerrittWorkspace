// Private-office availability.
//
// The office counterpart to deskAvailability.ts, and it answers a simpler
// question than that module does: an office is available when nobody is in it.
// There is no equivalent of the desk module's "paid member who hasn't picked a
// desk yet" reservation, because offices are assigned by staff at the point of
// sale rather than self-selected in the portal — a member never holds an office
// without holding a specific office number.
//
// Occupancy has the same two sources as the admin seating chart (see
// seating.ts): portal members holding `members.office_number`, and manual staff
// entries in `seating_manual_assignments`. An office is available only when
// NEITHER source claims it.
//
// Every kind of occupant makes a room unavailable, not just the paying primary:
//   - private_office_* — the member who pays for the room.
//   - office_member    — a $0 additional occupant of someone else's office.
//   - private_dedicated_desk — a desk member seated in an office we converted
//     into a dedicated-desk area. They pay for a desk, not the room, but the
//     room is still spoken for and cannot be sold as a private office.
//
// Counts only. This feeds public marketing pages, so it must never leak who
// sits where.
//
// Two audiences, two sets of numbers. The top-level fields describe the whole
// building, which is what staff see charted. `public` describes only the
// offices a prospect can actually be offered: it leaves out office 120, which
// is in the wellness building next door rather than the workspace, and splits
// the rest by size. Everything a member of the public reads — the membership
// pages, the trial form — comes from `public`.

import type { SupabaseClient } from '@supabase/supabase-js';
import { OFFICE_SPACES, PUBLIC_OFFICE_SPACES, canonicalizeSpaceNumber } from './seating';
import { summarizeOfficeSizes, type OfficeSizeAvailability } from './officeSizes';

// The minimal member shape the math needs. Kept structural (rather than
// importing the full Member type) so it can be unit-tested in isolation.
export interface OfficeAvailabilityMember {
  id: string;
  status?: string | null;
  office_number?: string | null;
  archived_at?: string | null;
}

export interface OfficeAvailability {
  // Every office in the building (see OFFICE_SPACES in seating.ts).
  capacity: number;
  // Canonical office numbers with someone in them, in floor order.
  occupiedOffices: string[];
  // Canonical office numbers with nobody in them, in floor order.
  availableOffices: string[];
  takenCount: number;
  remainingCount: number;
  isFull: boolean;
  // What the public side of the site is allowed to say. Never mix these with
  // the building-wide numbers above.
  public: PublicOfficeAvailability;
}

export interface PublicOfficeAvailability {
  // Offices on the workspace floor — the fourteen the marketing copy counts.
  capacity: number;
  takenCount: number;
  remainingCount: number;
  isFull: boolean;
  // The same free/total split, per office size — what a prospect choosing
  // between a single-desk room and a team room actually wants to know. Null
  // when the floor plan has no sizes recorded (lib/portal/officeSizes.ts),
  // which callers must report as "we don't know" rather than as zero.
  bySize: OfficeSizeAvailability | null;
}

// Same rule the desk module and the admin seating chart use: archived members
// have their room cleared on archive, and declined office-member requests never
// held one. Cancelled members still count until they're archived — they're in
// their notice period and the room is not yet re-sellable.
function holdsRoom(m: OfficeAvailabilityMember): boolean {
  return !m.archived_at && m.status !== 'declined';
}

// Office numbers are free text on the member record, so a typo or a legacy
// label can name a room that doesn't exist. Those can't consume one of the real
// offices, so they're ignored here — they still surface on the admin seating
// chart as an out-of-range extra, where staff can fix them.
const REAL_OFFICES = new Set(OFFICE_SPACES);
function realOffice(raw: string | null | undefined): string | null {
  const canonical = canonicalizeSpaceNumber('office', raw ?? null);
  return canonical && REAL_OFFICES.has(canonical) ? canonical : null;
}

/**
 * Pure availability math over already-fetched rows. Exported for unit tests and
 * for callers that already hold the member list and shouldn't re-query.
 */
export function summarizeOfficeAvailability(input: {
  members: OfficeAvailabilityMember[];
  manualOfficeNumbers: string[];
}): OfficeAvailability {
  const { members, manualOfficeNumbers } = input;

  const occupied = new Set<string>();
  for (const m of members) {
    if (!holdsRoom(m)) continue;
    const office = realOffice(m.office_number);
    if (office) occupied.add(office);
  }
  for (const raw of manualOfficeNumbers) {
    const office = realOffice(raw);
    if (office) occupied.add(office);
  }

  const occupiedOffices = OFFICE_SPACES.filter((o) => occupied.has(o));
  const availableOffices = OFFICE_SPACES.filter((o) => !occupied.has(o));

  // The same occupancy, narrowed to the offices we advertise.
  const publicAvailable = PUBLIC_OFFICE_SPACES.filter((o) => !occupied.has(o));

  return {
    capacity: OFFICE_SPACES.length,
    occupiedOffices,
    availableOffices,
    takenCount: occupiedOffices.length,
    remainingCount: availableOffices.length,
    isFull: availableOffices.length === 0,
    public: {
      capacity: PUBLIC_OFFICE_SPACES.length,
      takenCount: PUBLIC_OFFICE_SPACES.length - publicAvailable.length,
      remainingCount: publicAvailable.length,
      isFull: publicAvailable.length === 0,
      bySize: summarizeOfficeSizes(publicAvailable),
    },
  };
}

// Fetch both occupancy sources and run the math above.
export async function getOfficeAvailability(
  sb: SupabaseClient<any, any, any>,
): Promise<OfficeAvailability> {
  const FULL_COLUMNS = 'id, status, office_number, archived_at';
  // Physical occupancy only — enough to keep this working on a database where
  // the archive migration hasn't been applied yet. Mirrors the same fallback in
  // deskAvailability.ts.
  const CORE_COLUMNS = 'id, status, office_number';

  let { data: members, error: membersErr } = await sb.from('members').select(FULL_COLUMNS);
  if (membersErr && /column .* does not exist|archived_at/i.test(membersErr.message || '')) {
    console.warn(
      'members is missing archived_at — office availability will count archived members as still seated. Apply the pending migrations.',
    );
    ({ data: members, error: membersErr } = await sb.from('members').select(CORE_COLUMNS));
  }
  if (membersErr) throw new Error(membersErr.message);

  const { data: manual, error: manualErr } = await sb
    .from('seating_manual_assignments')
    .select('space_number')
    .eq('space_type', 'office');
  if (manualErr) throw new Error(manualErr.message);

  return summarizeOfficeAvailability({
    members: (members || []) as OfficeAvailabilityMember[],
    manualOfficeNumbers: (manual || []).map((r: { space_number: string }) => r.space_number),
  });
}
