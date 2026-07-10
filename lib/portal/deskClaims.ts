// Server-side occupancy check for dedicated desks.
//
// The seating chart has TWO sources of truth for who sits at a desk (see
// seating.ts):
//   1. Portal members — members.desk_number, set when a member claims a desk
//      in the portal or an admin edits their record.
//   2. Manual entries — the seating_manual_assignments table, entered by staff
//      for people who occupy a seat but aren't on the portal yet.
//
// A desk with an occupant in EITHER source is taken, so every member-facing
// path that assigns a desk must consult both. This helper is that single
// check; the portal assignment API and the existing-member migration both use
// it so no member can select a desk that already shows someone on the chart.

import type { SupabaseClient } from '@supabase/supabase-js';

export type DeskClaim =
  | { source: 'portal'; memberId: string }
  | { source: 'manual'; occupantName: string };

// Find who (if anyone) already holds `deskValue`, the canonical DD# form from
// normalizeDeskNumber. Portal members are checked first since they're the
// billing source of truth. Matching is case-insensitive so legacy values like
// "dd4" still collide with "DD4". Pass `excludeMemberId` when the caller is a
// member updating their own record, so their current desk doesn't block them.
export async function findDeskClaim(
  sb: SupabaseClient<any, any, any>,
  deskValue: string,
  opts: { excludeMemberId?: string } = {},
): Promise<DeskClaim | null> {
  let membersQuery = sb.from('members').select('id').ilike('desk_number', deskValue);
  if (opts.excludeMemberId) {
    membersQuery = membersQuery.neq('id', opts.excludeMemberId);
  }
  const { data: members, error: membersErr } = await membersQuery.limit(1);
  if (membersErr) throw new Error(membersErr.message);
  if (members && members.length > 0) {
    return { source: 'portal', memberId: members[0].id };
  }

  const { data: manual, error: manualErr } = await sb
    .from('seating_manual_assignments')
    .select('occupant_name')
    .eq('space_type', 'desk')
    .ilike('space_number', deskValue)
    .limit(1);
  if (manualErr) throw new Error(manualErr.message);
  if (manual && manual.length > 0) {
    return { source: 'manual', occupantName: manual[0].occupant_name };
  }

  return null;
}

// Does a manual seating-chart entry belong to this person? Used by the
// existing-member migration: staff chart not-yet-migrated members manually, and
// that entry must not block the member from declaring their own desk when they
// join the portal. Case- and whitespace-insensitive; anything fancier (nicknames,
// initials) fails closed and the member is pointed to member services.
export function manualOccupantMatchesName(
  occupantName: string,
  firstName: string,
  lastName: string,
): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  return norm(occupantName) === norm(`${firstName} ${lastName}`);
}
