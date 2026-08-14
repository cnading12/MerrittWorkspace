// Dedicated-desk availability and capacity.
//
// Two different questions are answered here, and they do NOT have the same
// answer:
//
//   1. WHICH desks are physically free — the list a member picks from in the
//      portal, and the list quoted in the signup welcome email.
//   2. HOW MANY of the building's dedicated desks are already spoken for — the
//      number that decides whether the shared coworking floor is full.
//
// A member who has finished the onboarding portal and is paying for a
// dedicated desk holds a seat even before they have picked a DD number:
// people routinely take a few days to choose one, or complete payment ahead
// of their start date. Those members consume capacity without occupying a
// specific desk, so "spoken for" is:
//
//     desks physically claimed  +  paid desk members who haven't picked yet
//
// Once that reaches DESK_COUNT (25) the shared floor is FULL. No new member
// can be sold a traditional floor-plan desk; dedicated-desk applicants are
// instead offered a PRIVATE dedicated desk inside a converted private office
// at the higher rate (see lib/portal/pricing.ts). Note that `isFull` can be
// true while `availableDesks` is still non-empty — those leftover desks are
// being held for the paid members who haven't chosen yet, which is exactly
// why the two questions are computed separately.
//
// Physical occupancy has the same two sources as the admin seating chart (see
// seating.ts / deskClaims.ts): portal members holding `members.desk_number`
// and manual staff entries in `seating_manual_assignments`. A desk is
// available only when NEITHER source claims it.
//
// `listAvailableDesks` is the list-shaped counterpart to `findDeskClaim`
// (which answers "is THIS desk taken?").

import type { SupabaseClient } from '@supabase/supabase-js';
import { DESK_COUNT } from './desks';
import { DESK_SPACES, canonicalizeSpaceNumber } from './seating';

// The minimal member shape the capacity math needs. Kept structural (rather
// than importing the full Member type) so it can be unit-tested in isolation.
export interface DeskCapacityMember {
  id: string;
  designation?: string | null;
  status?: string | null;
  desk_number?: string | null;
  // True once the member has completed the onboarding portal — documents,
  // agreements, and payment/auto-pay. This is what makes them a PAID member
  // and therefore a seat holder even without a desk number.
  onboarding_unlocked?: boolean | null;
  archived_at?: string | null;
}

export interface DeskCapacity {
  // Total dedicated desks in the building (25).
  capacity: number;
  // Canonical DD numbers physically claimed by someone, in floor order.
  claimedDesks: string[];
  // Paid dedicated-desk members who have not picked a desk number yet.
  reservedCount: number;
  // claimedDesks.length + reservedCount — the headline "X of 25" number.
  takenCount: number;
  // Desks left to sell, floored at zero.
  remainingCount: number;
  // No more traditional floor-plan desks may be sold.
  isFull: boolean;
  // DD numbers a member may actually pick right now. Excludes the requesting
  // member's own desk from the "taken" side so their current choice still
  // appears in their dropdown.
  availableDesks: string[];
}

// A member row only counts if they still hold their seat. Archived members
// have their desk cleared on archive, and declined office-member requests
// never held one. Cancelled members are still counted until they're archived —
// they're in their notice period and their desk is not yet re-sellable. This
// matches how the admin seating chart decides who to show (SeatingChart.tsx).
function holdsSeat(m: DeskCapacityMember): boolean {
  return !m.archived_at && m.status !== 'declined';
}

// Canonicalize a stored desk value, keeping only numbers that correspond to a
// desk that actually exists. A typo or a legacy label outside DD1–DD26 can't
// consume one of the 25 real desks, so it's ignored here (it still shows up on
// the admin seating chart as an out-of-range extra, where staff can fix it).
const REAL_DESKS = new Set(DESK_SPACES);
function realDesk(raw: string | null | undefined): string | null {
  const canonical = canonicalizeSpaceNumber('desk', raw ?? null);
  return canonical && REAL_DESKS.has(canonical) ? canonical : null;
}

/**
 * Pure capacity math over already-fetched rows. Exported for unit tests and
 * for callers (like the admin seating chart) that already hold the member
 * list and shouldn't re-query.
 */
export function summarizeDeskCapacity(input: {
  members: DeskCapacityMember[];
  manualDeskNumbers: string[];
  // The member asking. Their own desk is not treated as taken when building
  // `availableDesks`, so re-saving the same desk isn't blocked.
  excludeMemberId?: string;
}): DeskCapacity {
  const { members, manualDeskNumbers, excludeMemberId } = input;

  // Every desk with an occupant, and separately every desk occupied by
  // someone OTHER than the requesting member.
  const claimedAll = new Set<string>();
  const claimedByOthers = new Set<string>();

  for (const m of members) {
    if (!holdsSeat(m)) continue;
    const desk = realDesk(m.desk_number);
    if (!desk) continue;
    claimedAll.add(desk);
    if (!excludeMemberId || m.id !== excludeMemberId) claimedByOthers.add(desk);
  }
  for (const raw of manualDeskNumbers) {
    const desk = realDesk(raw);
    if (!desk) continue;
    claimedAll.add(desk);
    claimedByOthers.add(desk);
  }

  // Paid dedicated-desk members still deciding which desk to take. They hold a
  // seat even though no specific desk shows their name yet. Day-pass holders
  // (one_day_dedicated_desk) are deliberately excluded — a day pass doesn't
  // reserve a desk beyond the day it's used.
  let reservedCount = 0;
  for (const m of members) {
    if (!holdsSeat(m)) continue;
    if (m.designation !== 'dedicated_desk') continue;
    if (!m.onboarding_unlocked) continue;
    if (realDesk(m.desk_number)) continue;
    reservedCount++;
  }

  const claimedDesks = DESK_SPACES.filter((d) => claimedAll.has(d));
  const takenCount = claimedDesks.length + reservedCount;

  return {
    capacity: DESK_COUNT,
    claimedDesks,
    reservedCount,
    takenCount,
    remainingCount: Math.max(0, DESK_COUNT - takenCount),
    isFull: takenCount >= DESK_COUNT,
    availableDesks: DESK_SPACES.filter((d) => !claimedByOthers.has(d)),
  };
}

// Fetch both occupancy sources and run the math above.
export async function getDeskCapacity(
  sb: SupabaseClient<any, any, any>,
  opts: { excludeMemberId?: string } = {},
): Promise<DeskCapacity> {
  const FULL_COLUMNS = 'id, designation, status, desk_number, onboarding_unlocked, archived_at';
  // Physical occupancy only — enough to keep the desk picker working on a
  // database where the archive migration hasn't been applied yet. Matches the
  // fallback the admin members route uses for the same reason.
  const CORE_COLUMNS = 'id, designation, status, desk_number';

  let { data: members, error: membersErr } = await sb.from('members').select(FULL_COLUMNS);
  if (membersErr && /column .* does not exist|archived_at|onboarding_unlocked/i.test(membersErr.message || '')) {
    console.warn(
      'members is missing archived_at/onboarding_unlocked — desk capacity will count only desks that are physically claimed. Apply the pending migrations.',
    );
    ({ data: members, error: membersErr } = await sb.from('members').select(CORE_COLUMNS));
  }
  if (membersErr) throw new Error(membersErr.message);

  const { data: manual, error: manualErr } = await sb
    .from('seating_manual_assignments')
    .select('space_number')
    .eq('space_type', 'desk');
  if (manualErr) throw new Error(manualErr.message);

  return summarizeDeskCapacity({
    members: (members || []) as DeskCapacityMember[],
    manualDeskNumbers: (manual || []).map((r: { space_number: string }) => r.space_number),
    excludeMemberId: opts.excludeMemberId,
  });
}

export async function listAvailableDesks(
  sb: SupabaseClient<any, any, any>,
  opts: { excludeMemberId?: string } = {},
): Promise<string[]> {
  return (await getDeskCapacity(sb, opts)).availableDesks;
}

// Render a desk list for email/plain-text display, collapsing runs of
// consecutive numbers ("DD1–DD4, DD9, DD12") so a mostly-empty building
// doesn't produce a 26-item wall of text.
export function formatDeskList(desks: string[]): string {
  if (desks.length === 0) return '';
  const nums = desks
    .map((d) => parseInt(d.replace(/^DD/i, ''), 10))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  const parts: string[] = [];
  let runStart = nums[0];
  let prev = nums[0];
  const flush = () => {
    if (runStart === prev) parts.push(`DD${runStart}`);
    else if (prev === runStart + 1) parts.push(`DD${runStart}, DD${prev}`);
    else parts.push(`DD${runStart}–DD${prev}`);
  };
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === prev + 1) {
      prev = nums[i];
      continue;
    }
    flush();
    runStart = nums[i];
    prev = nums[i];
  }
  flush();
  return parts.join(', ');
}
