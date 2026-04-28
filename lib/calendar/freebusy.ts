// Server-side helper around Google Calendar's freebusy.query endpoint.
// Used to confirm a proposed flex-space booking does not overlap any
// already-busy block on the wellness or flex calendars before we commit.
//
// Authenticates with the workspace service account using the same
// GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY pattern as lib/google-calendar.ts.
import { google } from 'googleapis';

function getAuth() {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Missing Google Calendar credentials');
  }
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
  });
}

export interface BusyConflict {
  calendarId: string;
  start: string;
  end: string;
}

export interface FreebusyResult {
  busy: boolean;
  conflicts: BusyConflict[];
}

// Returns whether any of the given calendars has a busy block intersecting
// [start, end). Conflicts are returned for logging/debugging.
export async function checkFreebusy(
  start: Date,
  end: Date,
  calendarIds: string[]
): Promise<FreebusyResult> {
  const filtered = calendarIds.filter(Boolean);
  if (filtered.length === 0) {
    return { busy: false, conflicts: [] };
  }

  const auth = getAuth();
  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.freebusy.query({
    requestBody: {
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      items: filtered.map((id) => ({ id })),
    },
  });

  const calendars = res.data.calendars || {};
  const conflicts: BusyConflict[] = [];

  for (const id of filtered) {
    const cal = calendars[id];
    if (!cal) continue;
    if (cal.errors && cal.errors.length > 0) {
      // A calendar lookup failure (e.g. permissions) should fail closed —
      // we'd rather refuse a booking than silently let through a conflict.
      throw new Error(
        `freebusy lookup failed for ${id}: ${cal.errors
          .map((e) => e.reason)
          .join(', ')}`
      );
    }
    for (const block of cal.busy || []) {
      if (block.start && block.end) {
        conflicts.push({ calendarId: id, start: block.start, end: block.end });
      }
    }
  }

  return { busy: conflicts.length > 0, conflicts };
}
