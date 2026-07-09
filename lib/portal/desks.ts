// Validation helpers for dedicated-desk numbers.
//
// Dedicated-desk members self-assign a desk in the portal. We require the
// "DD#" format (e.g. DD4) within the building's range of DD1–DD26, and the
// desk must not already be occupied on the seating chart — whether it was
// claimed by another member in the portal or entered manually by staff (see
// deskClaims.ts for the occupancy check). Both the portal UI and the
// assignment API import these helpers so client + server stay in sync.

export const DD_MIN = 1;
export const DD_MAX = 26;

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
// zeros), e.g. "dd04" → "DD4", and enforces the DD1–DD26 range. The returned
// `value` is the canonical form used for storage and uniqueness checks.
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
