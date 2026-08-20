// Validation helpers for dedicated-desk numbers.
//
// Dedicated-desk members self-assign a desk in the portal. We require the
// "DD#" format (e.g. DD4) within the building's range of DD1–DD26 minus the
// retired numbers below, and the desk must not already be occupied on the
// seating chart — whether it was claimed by another member in the portal or
// entered manually by staff (see deskClaims.ts for the occupancy check). Both
// the portal UI and the assignment API import these helpers so client +
// server stay in sync.

export const DD_MIN = 1;
export const DD_MAX = 26;

// Numbers inside the DD range that have no desk behind them. DD5 sat awkwardly
// between two other desks and was pulled off the floor; the remaining desks
// keep their existing labels (DD4 and DD6 were not renumbered), so DD5 is
// simply retired and can never be claimed. Same idea as office 113, which
// doesn't exist either — see seating.ts.
export const REMOVED_DESK_NUMBERS: readonly number[] = [5];

// Every dedicated desk that actually exists, in order: the DD_MIN–DD_MAX range
// with the retired numbers taken out. 25 desks today (DD1–DD26 without DD5).
export const DESK_NUMBERS: readonly number[] = Array.from(
  { length: DD_MAX - DD_MIN + 1 },
  (_, i) => DD_MIN + i
).filter((n) => !REMOVED_DESK_NUMBERS.includes(n));

// Total number of dedicated desks in the building.
export const DESK_COUNT = DESK_NUMBERS.length;

// PRIVATE dedicated desks: desks in private offices we've converted into
// dedicated-desk areas, sold at the higher private rate once the shared floor
// fills up (see lib/portal/pricing.ts and lib/portal/deskAvailability.ts).
//
// Unlike the floor-plan desks these have no individual numbers — a private-desk
// member is recorded against the office they sit in, not a DD number — so the
// count is a plain capacity rather than a list of labels. Bump this if more
// offices are converted; it is the only place the number is written down.
export const PRIVATE_DESK_COUNT = 4;

// Human-readable description of the valid desk numbers, e.g.
// "DD1–DD26 (there is no DD5)". Shared by the portal and onboarding copy so a
// future removal only has to be recorded in REMOVED_DESK_NUMBERS.
export const DESK_RANGE_LABEL = `DD${DD_MIN}–DD${DD_MAX}${
  REMOVED_DESK_NUMBERS.length
    ? ` (there is no ${REMOVED_DESK_NUMBERS.map((n) => `DD${n}`).join(' or ')})`
    : ''
}`;

// Member services contact, surfaced when a desk is taken or invalid so the
// member can flag a mistake.
export const MEMBER_SERVICES_PHONE_DISPLAY = '(303) 359-8337';
export const MEMBER_SERVICES_PHONE_TEL = '+13033598337';
export const MEMBER_SERVICES_EMAIL = 'memberservices@merrittworkspace.net';

export type DeskValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

// Normalize and validate a dedicated-desk number. Accepts a case-insensitive
// "DD" prefix (with or without surrounding/inner whitespace and leading
// zeros), e.g. "dd04" → "DD4", enforces the DD1–DD26 range, and rejects the
// retired numbers that no longer have a desk. The returned `value` is the
// canonical form used for storage and uniqueness checks.
export function normalizeDeskNumber(raw: string): DeskValidationResult {
  const trimmed = (raw || '').trim();
  if (!trimmed) {
    return {
      ok: false,
      error: 'Enter your desk number in the format DD# (for example, DD4).',
    };
  }
  const match = trimmed.toUpperCase().match(/^DD\s*0*(\d+)$/);
  if (!match) {
    return {
      ok: false,
      error:
        'Desk number must be in the format DD# — start with "DD" followed by a number (for example, DD4).',
    };
  }
  const n = parseInt(match[1], 10);
  if (!Number.isFinite(n) || n < DD_MIN || n > DD_MAX) {
    return {
      ok: false,
      error: `Desk number must be between DD${DD_MIN} and DD${DD_MAX}.`,
    };
  }
  if (REMOVED_DESK_NUMBERS.includes(n)) {
    return {
      ok: false,
      error:
        `There is no desk DD${n} — it was removed from the floor. Dedicated ` +
        `desks are numbered ${DESK_RANGE_LABEL}.`,
    };
  }
  return { ok: true, value: `DD${n}` };
}

// Message shown when the requested desk is already claimed by someone else.
export function deskTakenMessage(value: string): string {
  return (
    `Desk ${value} has already been claimed by another member, so it can't be ` +
    `selected. If you think this is a mistake, call Member Services at ` +
    `${MEMBER_SERVICES_PHONE_DISPLAY} or email ${MEMBER_SERVICES_EMAIL}.`
  );
}
