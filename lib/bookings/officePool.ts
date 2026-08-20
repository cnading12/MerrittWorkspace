// Shared office-pooling helpers for the two bookable resources.
//
// Both the conference room and the flex space pool their allowances PER
// OFFICE rather than per member. An office can hold several occupants — one
// paying "primary" plus any number of $0 "office members" — and they all draw
// from a single allowance: the highest among the occupants, in practice the
// primary's. A member with no office_number keeps a personal allowance.
//
// This lives apart from conference-hours.ts so flex-hours.ts can use exactly
// the same occupancy rules rather than a parallel implementation that drifts.

import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

// Designations whose allowance is pooled per office when the member has an
// office_number. Kept as a local list (rather than importing portal types) so
// this module stays dependency-light for unit tests.
//
// Deliberately excludes private_dedicated_desk: several private-desk members
// can share one converted office, and pooling would make them compete for a
// single allowance instead of each keeping their own.
const OFFICE_POOLED_DESIGNATIONS = new Set([
  'private_office_single',
  'private_office_double',
  'private_office_large',
  'office_member',
]);

export function isOfficePooledDesignation(
  designation: string | null | undefined
): boolean {
  return !!designation && OFFICE_POOLED_DESIGNATIONS.has(designation);
}

// Occupants of an office share a canonical key: office numbers are free text
// on the members row, so match them the same way the seating chart does
// (trimmed + uppercased).
export function officeKey(raw: string | null | undefined): string | null {
  const v = (raw || '').trim().toUpperCase();
  return v || null;
}

export interface OfficeOccupant {
  id: string;
  designation: string | null;
}

// Everyone currently occupying the given office: the paying primary plus any
// office members. Cancelled/declined/archived members no longer hold a seat
// and are excluded (their historical bookings also stop counting against the
// pool, matching how a freed seat behaves elsewhere).
export async function getOfficeOccupants(
  officeNumber: string
): Promise<OfficeOccupant[]> {
  const key = officeKey(officeNumber);
  if (!key) return [];
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('members')
    .select('id, designation, status, office_number, archived_at')
    .not('office_number', 'is', null);
  if (error) throw new Error(`office occupants query failed: ${error.message}`);
  return (data || [])
    .filter(
      (m: any) =>
        officeKey(m.office_number) === key &&
        !m.archived_at &&
        m.status !== 'cancelled' &&
        m.status !== 'declined'
    )
    .map((m: any) => ({ id: m.id, designation: m.designation ?? null }));
}

// The occupant list for a pooled member, guaranteed to include the caller.
// The occupants query can miss them on a status edge case, and their own
// bookings must always count against the pool they draw from.
export async function getPoolOccupants(member: {
  id: string;
  designation: string | null;
  office_number?: string | null;
}): Promise<OfficeOccupant[]> {
  const occupants = await getOfficeOccupants(member.office_number || '');
  if (occupants.some((o) => o.id === member.id)) return occupants;
  return [...occupants, { id: member.id, designation: member.designation }];
}

// Does this member draw on a shared office pool at all?
export function poolsPerOffice(member: {
  designation: string | null;
  office_number?: string | null;
}): boolean {
  return (
    !!member.office_number && isOfficePooledDesignation(member.designation)
  );
}
