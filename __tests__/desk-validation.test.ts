import { describe, it, expect } from 'vitest';
import {
  normalizeDeskNumber,
  DD_MIN,
  DD_MAX,
  DESK_COUNT,
  DESK_NUMBERS,
  DESK_RANGE_LABEL,
  REMOVED_DESK_NUMBERS,
} from '@/lib/portal/desks';

// Guards the dedicated-desk number rules enforced in both the portal UI
// (app/portal/page.tsx WorkspaceAssignmentSection) and the assignment API
// (app/api/portal/assignment/route.ts): members must enter "DD#" within the
// DD1–DD26 range, excluding retired numbers like DD5 which no longer has a
// desk. Uniqueness is enforced separately at the database layer.

describe('normalizeDeskNumber', () => {
  it('accepts a well-formed DD number', () => {
    const r = normalizeDeskNumber('DD4');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('DD4');
  });

  it('normalizes casing, whitespace, and leading zeros', () => {
    for (const input of ['dd4', ' DD4 ', 'Dd04', 'DD 4', 'dd 04']) {
      const r = normalizeDeskNumber(input);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe('DD4');
    }
  });

  it('accepts both ends of the range', () => {
    expect(normalizeDeskNumber(`DD${DD_MIN}`).ok).toBe(true);
    expect(normalizeDeskNumber(`DD${DD_MAX}`).ok).toBe(true);
  });

  it('rejects a bare number with no DD prefix', () => {
    const r = normalizeDeskNumber('4');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/DD#/);
  });

  it('rejects numbers outside DD1–DD26', () => {
    for (const input of ['DD0', 'DD27', 'DD100']) {
      const r = normalizeDeskNumber(input);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/between DD1 and DD26/);
    }
  });

  it('rejects empty input and malformed values', () => {
    for (const input of ['', '   ', 'DD', 'DDA', 'D4', 'desk4', 'DD4A']) {
      expect(normalizeDeskNumber(input).ok).toBe(false);
    }
  });

  it('rejects DD5, which was removed from the floor', () => {
    for (const input of ['DD5', 'dd5', ' DD 05 ', 'dd05']) {
      const r = normalizeDeskNumber(input);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toMatch(/no desk DD5/i);
    }
  });

  it('still accepts the desks either side of the removed DD5', () => {
    expect(normalizeDeskNumber('DD4').ok).toBe(true);
    expect(normalizeDeskNumber('DD6').ok).toBe(true);
  });
});

describe('the desk inventory', () => {
  it('is the DD range minus the removed desks', () => {
    expect(REMOVED_DESK_NUMBERS).toEqual([5]);
    expect(DESK_COUNT).toBe(25);
    expect(DESK_NUMBERS).not.toContain(5);
    expect(DESK_NUMBERS[0]).toBe(DD_MIN);
    expect(DESK_NUMBERS[DESK_COUNT - 1]).toBe(DD_MAX);
  });

  it('every listed desk passes validation', () => {
    for (const n of DESK_NUMBERS) {
      expect(normalizeDeskNumber(`DD${n}`).ok).toBe(true);
    }
  });

  it('describes the numbering for member-facing copy', () => {
    expect(DESK_RANGE_LABEL).toBe('DD1–DD26 (there is no DD5)');
  });
});
