import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FLEX_OPEN_MINUTES, FLEX_CLOSE_MINUTES } from '@/lib/hours';

// The availability grid on the flex space page draws a fixed window — the
// bookable hours, 8:00 AM to 4:00 PM Mountain — and then positions each busy
// block inside it by interpolating between the day column's own start/end
// instants and the grid's pixel height.
//
// That only works while the column's window and the grid's window are the same
// window. They were not: the grid ran 8:00–4:00 while every column reported
// 9:00–4:30. Two bugs came out of the mismatch, and the first is the one that
// got reported as "the calendar isn't showing already booked events":
//
//   1. A booking that ended at or before 9:00 had no overlap with its column's
//      window at all, so the overlap filter dropped it. An 8:00–9:00 booking
//      never rendered — the slot looked free right up until the booking form
//      rejected it.
//   2. Everything else was drawn against a 7.5-hour window on an 8-hour grid,
//      so blocks sat roughly an hour too high and ~7% too short.
//
// The fix derives the column window from the same constants the grid uses.
// These tests pin the arithmetic that fix depends on, plus the source-level
// guarantee that nobody reintroduces a hard-coded hour.

const SOURCE = readFileSync(
  resolve(__dirname, '../components/portal/FlexCalendar.tsx'),
  'utf8',
);

/** What DayColumn does: overlap the block with the column, then position it. */
function place(
  block: { start: number; end: number },
  column: { start: number; end: number },
  gridHeight: number,
): { top: number; height: number } | null {
  const overlapStart = Math.max(block.start, column.start);
  const overlapEnd = Math.min(block.end, column.end);
  if (overlapEnd <= overlapStart) return null;
  const span = column.end - column.start;
  return {
    top: ((overlapStart - column.start) / span) * gridHeight,
    height: ((overlapEnd - overlapStart) / span) * gridHeight,
  };
}

const MIN = 60_000;
const GRID_HEIGHT = 448; // 16 half-hour rows at 28px, as the component renders

/** The column window as the fixed component builds it, in ms from midnight. */
const column = {
  start: FLEX_OPEN_MINUTES * MIN,
  end: FLEX_CLOSE_MINUTES * MIN,
};

const at = (hour: number, minute = 0) => (hour * 60 + minute) * MIN;

describe('the availability grid places bookings against the bookable window', () => {
  it('renders a booking in the first hour of the day', () => {
    // The regression. 8:00–9:00 fell entirely outside the old 9:00 column
    // start, so it was filtered out and the slot rendered as free.
    const placed = place({ start: at(8), end: at(9) }, column, GRID_HEIGHT);
    expect(placed, '8:00–9:00 booking was dropped from the calendar').not.toBeNull();
    expect(placed!.top).toBe(0);
    expect(placed!.height).toBe(GRID_HEIGHT / 8); // one hour of an 8-hour day
  });

  it('puts a mid-morning booking where the hour labels say it is', () => {
    const placed = place({ start: at(10), end: at(11, 30) }, column, GRID_HEIGHT)!;
    // 10:00 is two hours into an eight-hour day.
    expect(placed.top).toBe(GRID_HEIGHT * (2 / 8));
    expect(placed.height).toBe(GRID_HEIGHT * (1.5 / 8));
  });

  it('renders a booking that runs to the 4:00 close', () => {
    const placed = place({ start: at(15), end: at(16) }, column, GRID_HEIGHT)!;
    expect(placed.top).toBe(GRID_HEIGHT * (7 / 8));
    expect(placed.top + placed.height).toBe(GRID_HEIGHT);
  });

  it('clips a booking that starts before the window rather than dropping it', () => {
    const placed = place({ start: at(7), end: at(9) }, column, GRID_HEIGHT)!;
    expect(placed.top).toBe(0);
    expect(placed.height).toBe(GRID_HEIGHT / 8);
  });

  it('still drops a block with no overlap at all', () => {
    expect(place({ start: at(17), end: at(18) }, column, GRID_HEIGHT)).toBeNull();
    expect(place({ start: at(6), end: at(7) }, column, GRID_HEIGHT)).toBeNull();
  });

  it('spans exactly the window, so the last row lands on the close', () => {
    const full = place({ start: column.start, end: column.end }, column, GRID_HEIGHT)!;
    expect(full.top).toBe(0);
    expect(full.height).toBe(GRID_HEIGHT);
  });
});

describe('the calendar source', () => {
  it('builds the day window from the flex-hours constants, not literals', () => {
    // The mismatch that caused this was a pair of hard-coded hours drifting
    // away from the constants beside them.
    expect(SOURCE).toContain('OPEN_MINUTES / 60');
    expect(SOURCE).toContain('CLOSE_MINUTES / 60');
    expect(SOURCE).not.toContain('mtInstant(y, m, d, 9, 0)');
    expect(SOURCE).not.toContain('mtInstant(y, m, d, 16, 30)');
  });

  it('does not require a token to load availability', () => {
    // The page is public; "is the hall free on Thursday" should not need an
    // account. A token only decides which blocks are flagged as the caller's.
    expect(SOURCE).not.toContain('if (!authToken || week.length === 0) return;');
    expect(SOURCE).toContain('authToken ? { Authorization:');
  });
});
