import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The side-by-side table on /membership earns its space by showing where the
// tiers DIFFER. A row whose five cells all say the same thing shows nothing —
// it is five identical marks, a line of vertical scroll, and one more thing to
// read before reaching a row that actually decides anything. Those facts live
// in a note under the table instead.
//
// That split is a judgement someone has to keep making, so it is asserted here
// rather than left as a comment: add a row that turns out to be uniform, or
// leave an item in the note after it stops being universal, and this fails.
//
// The page is a client component full of JSX, so the table data is read out of
// the source text rather than imported. That is deliberate — the alternative is
// hoisting COMPARE_ROWS into a lib file purely to make it importable, which
// moves the data further from the only place that renders it.

const SOURCE = readFileSync(
  resolve(__dirname, '../app/membership/(overview)/page.tsx'),
  'utf8',
);

function block(name: string): string {
  const start = SOURCE.indexOf(`const ${name}`);
  expect(start, `${name} not found in the membership page`).toBeGreaterThan(-1);
  const end = SOURCE.indexOf('\n];', start);
  expect(end, `${name} is not a bracketed literal`).toBeGreaterThan(start);
  return SOURCE.slice(start, end);
}

/** Every capture group 1..n of `pattern`, across a string. */
function allMatches(source: string, pattern: RegExp): RegExpExecArray[] {
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  const out: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    out.push(m);
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

/**
 * Split a JS array literal's body into its top-level elements.
 *
 * Not a plain `split(',')`: '$1,200' is a single cell containing a comma, and
 * splitting naively reports six cells in a five-column row — which is exactly
 * the kind of miscount this file exists to catch, so it must not invent one.
 */
function cells(raw: string): string[] {
  const out: string[] = [];
  let current = '';
  let quote: string | null = null;
  for (const ch of raw) {
    if (quote) {
      current += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === ',') {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out.filter(Boolean);
}

/** Every `{ label: '…', values: [...] }` entry in COMPARE_ROWS. */
function compareRows(): { label: string; cells: string[] }[] {
  return allMatches(
    block('COMPARE_ROWS'),
    /\{\s*label:\s*'([^']+)',\s*values:\s*\[([^\]]*)\]/g,
  ).map(m => ({ label: m[1], cells: cells(m[2]) }));
}

describe('the membership comparison table', () => {
  const rows = compareRows();

  it('has rows to check', () => {
    expect(rows.length).toBeGreaterThan(5);
  });

  it('gives every row one cell per column', () => {
    const columns = (SOURCE.match(/const COMPARE_COLS = \[([^\]]*)\]/) ?? [])[1];
    const columnCount = cells(columns!).length;
    for (const row of rows) {
      expect(row.cells.length, `${row.label} has ${row.cells.length} cells`).toBe(columnCount);
    }
  });

  it('keeps no row whose every cell is identical', () => {
    for (const row of rows) {
      const distinct = new Set(row.cells);
      expect(
        distinct.size,
        `"${row.label}" says the same thing in all ${row.cells.length} columns — ` +
          'it belongs in the EVERY_TIER note under the table, not in it',
      ).toBeGreaterThan(1);
    }
  });

  it('never repeats a fact the every-tier note already makes', () => {
    // Not a string match on the copy — the note and a row can legitimately word
    // the same subject differently. What must not happen is a row existing for
    // a subject the note has already declared universal.
    const noted = allMatches(block('EVERY_TIER'), /'([^']+)'/g).map(m =>
      m[1].toLowerCase(),
    );
    expect(noted.length).toBeGreaterThan(0);

    const SUBJECTS = ['coffee', 'printing', 'parking', 'storage', 'phone booth'];
    for (const subject of SUBJECTS) {
      const inNote = noted.some(n => n.includes(subject));
      const inTable = rows.some(r => r.label.toLowerCase().includes(subject));
      expect(
        inNote && inTable,
        `"${subject}" appears both as a table row and in the every-tier note`,
      ).toBe(false);
    }
  });
});

describe('the every-tier note', () => {
  it('covers every column the table has', () => {
    // The note speaks for all five columns at once, so it is only honest while
    // the table still has exactly the columns it was written against. A new
    // tier is a prompt to re-check each line of the note against it.
    const columns = (SOURCE.match(/const COMPARE_COLS = \[([^\]]*)\]/) ?? [])[1];
    expect(cells(columns!).length).toBe(5);
  });

  it('says something', () => {
    expect(allMatches(block('EVERY_TIER'), /'([^']+)'/g).length).toBeGreaterThan(2);
  });
});
