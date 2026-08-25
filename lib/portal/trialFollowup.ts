// Selecting which trial applicants get the "ready to join?" email.
//
// Split out from the cron route so the selection rules are testable without
// standing up a request, a database, or Resend.

import { readApplicationKind, readTrialSeating, type TrialSeating } from './trialApplication';

export interface TrialFollowupRow {
  id: string;
  first_name?: string | null;
  email?: string | null;
  trial_date?: string | null;
  resume_token?: string | null;
  application_kind?: string | null;
  conversion_email_sent_at?: string | null;
  converted_to_application_id?: string | null;
  payload?: Record<string, unknown> | null;
}

export interface TrialFollowupTarget {
  id: string;
  email: string;
  firstName: string;
  trialDate: string | null;
  resumeToken: string;
  seating: TrialSeating;
}

// A trial applicant is due a follow-up when their day has passed, we have not
// already written to them, and they have not already converted.
//
// The date comparison is `trial_date < today` in Denver, so someone still
// mid-visit is never asked how it went. ISO date strings sort
// lexicographically, so this needs no timezone maths of its own.
export function isDueFollowup(row: TrialFollowupRow, today: string): boolean {
  if (readApplicationKind(row) !== 'trial') return false;
  if (row.conversion_email_sent_at) return false;
  if (row.converted_to_application_id) return false;
  if (!row.email) return false;
  // No token means no prefill, and a follow-up without the prefill is just a
  // link to a blank 40-field form — the exact thing this work removes. Skip
  // it and leave the row for a manual send once the migration is applied.
  if (!row.resume_token) return false;
  const trialDate = row.trial_date || (typeof row.payload?.trial_date === 'string' ? row.payload.trial_date : null);
  if (!trialDate) return false;
  return trialDate < today;
}

export function toFollowupTarget(row: TrialFollowupRow): TrialFollowupTarget | null {
  if (!row.email || !row.resume_token) return null;
  const trialDate =
    row.trial_date || (typeof row.payload?.trial_date === 'string' ? row.payload.trial_date : null);
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name || '',
    trialDate,
    resumeToken: row.resume_token,
    seating: readTrialSeating(row.payload?.trial_seating),
  };
}

export function selectFollowupTargets(
  rows: TrialFollowupRow[],
  today: string
): TrialFollowupTarget[] {
  return rows
    .filter((row) => isDueFollowup(row, today))
    .map(toFollowupTarget)
    .filter((t): t is TrialFollowupTarget => t !== null);
}
