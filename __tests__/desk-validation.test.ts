import { describe, it, expect } from 'vitest';
import { normalizeDeskNumber, DD_MIN, DD_MAX } from '@/lib/portal/desks';

// Guards the dedicated-desk number rules enforced in both the portal UI
// (app/portal/page.tsx WorkspaceAssignmentSection) and the assignment API
// (app/api/portal/assignment/route.ts): members must enter "DD#" within the
// DD1–DD26 range. Uniqueness is enforced separately at the database layer.

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
});
