// Which dedicated desks are currently free.
//
// Occupancy has the same two sources as the admin seating chart (see
// seating.ts / deskClaims.ts): portal members holding `members.desk_number`
// and manual staff entries in `seating_manual_assignments`. A desk is
// available only when NEITHER source claims it.
//
// This is the list-shaped counterpart to `findDeskClaim` (which answers "is
// THIS desk taken?"). It's used by the signup welcome email so a new
// dedicated-desk member is told exactly which DD numbers they can pick from,
// instead of guessing and hitting a "desk already claimed" error in the portal.

import type { SupabaseClient } from '@supabase/supabase-js';
import { DESK_SPACES, canonicalizeSpaceNumber } from './seating';

export async function listAvailableDesks(
  sb: SupabaseClient<any, any, any>,
  opts: { excludeMemberId?: string } = {},
): Promise<string[]> {
  const taken = new Set<string>();

  let membersQuery = sb.from('members').select('id, desk_number').not('desk_number', 'is', null);
  if (opts.excludeMemberId) {
    membersQuery = membersQuery.neq('id', opts.excludeMemberId);
  }
  const { data: members, error: membersErr } = await membersQuery;
  if (membersErr) throw new Error(membersErr.message);
  for (const m of members || []) {
    const canonical = canonicalizeSpaceNumber('desk', m.desk_number);
    if (canonical) taken.add(canonical);
  }

  const { data: manual, error: manualErr } = await sb
    .from('seating_manual_assignments')
    .select('space_number')
    .eq('space_type', 'desk');
  if (manualErr) throw new Error(manualErr.message);
  for (const row of manual || []) {
    const canonical = canonicalizeSpaceNumber('desk', row.space_number);
    if (canonical) taken.add(canonical);
  }

  return DESK_SPACES.filter((d) => !taken.has(d));
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
