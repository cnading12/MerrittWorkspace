// Trial-day applications: the short path through /membership/apply.
//
// A trial applicant is not a membership applicant. Nothing about their visit
// is gated on a decision — /api/membership-application/trial sends the
// trial-day email in the same request that stores the row, exactly as the
// combined form always did — so the references, emergency contact, and
// professional details the full application collects have nothing to gate.
// They ask a stranger for their mortgage company in exchange for one day at
// a desk, and we never read the answer.
//
// So the trial form collects contact details, which seating they want to
// try, a date, and a photo ID. The helpers here are what let that shorter
// submission grow into a full application later without asking the person
// for anything a second time.

import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from './uploads';

export type ApplicationKind = 'trial' | 'full';

// Where a trial visitor will actually work for the day. The trial-day email
// needs this because the three answers need three different sets of
// instructions:
//   desk   — self-serve, with the live list of free DD numbers.
//   office — coordinated with member services first, because an office has
//            to be unlocked and equipped ahead of time.
//   cafe   — a different building. Café members work from the front of the
//            restored 1905 hall next door, not the coworking floor, so the
//            arrival and seating guidance is the part that changes; the
//            workspace itself stays open to them all day for the kitchen,
//            printing, meeting rooms and everything else.
export type TrialSeating = 'desk' | 'office' | 'cafe';

// The largest photo ID we will take. Re-exported from lib/portal/uploads.ts
// rather than declared again — that file carries the reasoning.
//
// This file used to own a second copy of the number while the portal
// document upload and the guest booking kept a 10MB one, which is how the
// portal came to report "Load failed" for a phone photo: the reasoning had
// been worked out once, here, and never reached the other three upload
// paths.
export const MAX_ID_FILE_BYTES = MAX_UPLOAD_BYTES;
export const MAX_ID_FILE_LABEL = MAX_UPLOAD_LABEL;

// What the upload input will take, and the same list the route enforces.
//
// One allowlist, in lib/portal/uploads.ts, shared with the portal and
// guest-booking uploads: a blanket `image/*` here would let the browser hand
// us an SVG, which is a document that can carry script and is stored with
// the content type it declares. Staff open these through a signed URL, so
// that is script execution on the storage origin. Photographs of a licence
// are JPEG, PNG, WEBP or HEIC; a scan is a PDF; nothing legitimate is lost.
export const ACCEPTED_ID_MIME_TYPES: readonly string[] = ALLOWED_UPLOAD_MIME_TYPES;

export function isAcceptedIdMimeType(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  const type = mimeType.toLowerCase().split(';')[0].trim();
  return ACCEPTED_ID_MIME_TYPES.includes(type);
}

// Storage path for a trial applicant's photo ID inside the private
// `member-documents` bucket.
//
// The `trial-applications/` prefix is load-bearing, the same way
// `guest-bookings/` is: the member storage policies in
// 20260406_storage_rls_policies.sql match on the first path segment being a
// members.id UUID, and this literal can never be one. Members therefore
// cannot read these files; admins reach them through service-role signed
// URLs on the admin Documents page.
export function trialIdDocumentPath(applicationId: string, fileName: string, now: number): string {
  const ext = fileNameExtension(fileName);
  return `trial-applications/${applicationId}/photo_id-${now}.${ext}`;
}

// Extension for the stored object. Falls back to `bin` rather than trusting
// a name like `id` or `photo.` — the extension is cosmetic here (the mime
// type is stored alongside), so a wrong guess must not produce a weird path.
export function fileNameExtension(fileName: string): string {
  const parts = String(fileName || '').split('.');
  if (parts.length < 2) return 'bin';
  const ext = parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext || 'bin';
}

// Bearer credential behind the "finish your membership application" link.
//
// Stored (not an HMAC over the row id like lib/portal/cancelToken.ts)
// precisely because it is revocable: this token prefills someone's name,
// phone, and carries their photo ID forward, so we want to be able to null
// the column and kill the link.
//
// Uses the Web Crypto global rather than node:crypto so this module stays
// importable from the client form, which needs the constants and validation
// below. 32 random bytes as hex — url-safe without any encoding step.
export function generateResumeToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Reading the kind off a row.
//
// Same defensive shape as lib/portal/trial.ts: the dedicated column wins,
// and `payload.application_kind` is the fallback for a database where
// 20260824_trial_application_split.sql has not been applied yet. A row that
// says nothing is a full application — that is what every row was before
// this split existed.
interface ApplicationKindSource {
  application_kind?: string | null;
  payload?: Record<string, unknown> | null;
}

export function readApplicationKind(source: ApplicationKindSource | null | undefined): ApplicationKind {
  if (!source) return 'full';
  if (source.application_kind === 'trial' || source.application_kind === 'full') {
    return source.application_kind;
  }
  const fromPayload = (source.payload as { application_kind?: unknown } | null)?.application_kind;
  return fromPayload === 'trial' ? 'trial' : 'full';
}

export function isTrialApplication(source: ApplicationKindSource | null | undefined): boolean {
  return readApplicationKind(source) === 'trial';
}

// Did this trial applicant's photo ID fail to save?
//
// The ID is checked before someone spends a day in the building, so when the
// upload does not land the visit still happens — staff just have to check
// the ID at the door. The admin card says so rather than the application
// quietly looking complete.
//
// Two signals, because a database that has not had
// 20260824_trial_application_split.sql applied has no `id_document_path`
// column at all: the explicit `payload.id_upload_failed` flag the route
// writes, and a present-but-empty column. A row from a database without the
// column reports false — absent is not the same as empty, and inventing a
// warning on every trial card would train staff to ignore it.
export function trialPhotoIdMissing(
  source: (ApplicationKindSource & { id_document_path?: string | null }) | null | undefined
): boolean {
  if (!source || !isTrialApplication(source)) return false;
  if ((source.payload as { id_upload_failed?: unknown } | null)?.id_upload_failed === true) {
    return true;
  }
  return 'id_document_path' in source && !source.id_document_path;
}

// Narrow a stored seating value. Anything unrecognised — an older row, a
// tier that no longer exists — reads as a desk, which is the variant whose
// instructions are safe for someone standing in the coworking building.
export function readTrialSeating(value: unknown): TrialSeating {
  if (value === 'office' || value === 'cafe') return value;
  return 'desk';
}

// The plan a trial applicant should find preselected when they come back to
// apply for real, when all we know is which seating they tried. A trial that
// recorded a specific plan (see TRIAL_PLANS_BY_SEATING) beats this.
export const PLAN_FOR_TRIAL_SEATING: Record<TrialSeating, string> = {
  desk: 'dedicated_desk',
  office: 'private_office_single',
  cafe: 'cafe_membership',
};

// The plans behind each seating choice — the second question the trial form
// asks once someone has said where they want to work.
//
// "A private office" is three different rooms at three different prices, and
// "a dedicated desk" is two: one on the shared floor, one inside a converted
// office. A trial day is a preview of a specific thing, and staff have to put
// the person in an actual room on the day, so the form asks which. The café
// is the one seating with a single answer, so it never asks.
//
// Order matters — it is the order the options are offered in, cheapest first.
export const TRIAL_PLANS_BY_SEATING: Record<TrialSeating, readonly string[]> = {
  desk: ['dedicated_desk', 'private_dedicated_desk'],
  office: ['private_office_single', 'private_office_double', 'private_office_large'],
  cafe: ['cafe_membership'],
};

/** Does this seating choice need a second question? */
export function trialSeatingNeedsPlan(seating: TrialSeating): boolean {
  return TRIAL_PLANS_BY_SEATING[seating].length > 1;
}

/**
 * The plan a trial submission records, given what the person picked.
 *
 * Falls back to the seating's default rather than throwing: a plan that does
 * not belong to the chosen seating is a validation problem
 * (validateTrialSubmission catches it and says so), and this function's job
 * is only to make sure a row is never written with a plan from the wrong
 * seating.
 */
export function trialPlanFor(seating: TrialSeating, plan: string | null | undefined): string {
  const allowed = TRIAL_PLANS_BY_SEATING[seating];
  if (plan && allowed.includes(plan)) return plan;
  return allowed.length === 1 ? allowed[0] : PLAN_FOR_TRIAL_SEATING[seating];
}

/** Which seating a plan id belongs to, or null if it is not a trialable plan. */
export function seatingForTrialPlan(plan: string | null | undefined): TrialSeating | null {
  if (!plan) return null;
  for (const seating of ['desk', 'office', 'cafe'] as const) {
    if (TRIAL_PLANS_BY_SEATING[seating].includes(plan)) return seating;
  }
  return null;
}

// The fields a trial applicant already gave us, in the shape the full
// application form wants them. Everything here is prefilled and editable —
// a trial visitor may well have changed jobs or numbers by the time they
// convert, so nothing is locked.
export interface TrialPrefill {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name: string;
  // Seating they trialed, used to preselect a plan on the full form.
  seating: TrialSeating;
  // The specific plan they tried — which office size, or which kind of desk.
  // Older trial rows recorded only the seating, so this falls back to that
  // seating's default rather than being null.
  plan: string;
  trial_date: string | null;
  // True when a photo ID is already on file from the trial, so the full
  // form can say "already on file" instead of asking for it again.
  has_id_document: boolean;
}

interface TrialRow {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  trial_date?: string | null;
  id_document_path?: string | null;
  payload?: Record<string, unknown> | null;
}

export function trialPrefillFrom(row: TrialRow): TrialPrefill {
  const payload = (row.payload || {}) as {
    trial_seating?: unknown;
    trial_plan?: unknown;
    trial_date?: unknown;
  };
  const seating: TrialSeating = readTrialSeating(payload.trial_seating);
  const plan = trialPlanFor(
    seating,
    typeof payload.trial_plan === 'string' ? payload.trial_plan : null
  );
  const trialDate =
    row.trial_date || (typeof payload.trial_date === 'string' ? payload.trial_date : null);
  return {
    first_name: row.first_name || '',
    last_name: row.last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    company_name: row.company_name || '',
    seating,
    plan,
    trial_date: trialDate,
    has_id_document: !!row.id_document_path,
  };
}

// Validation for a trial submission. Returns the first problem in form
// order so the error message points at the field the person is looking at.
//
// Note what is NOT here: no plan selection, no price, no start date. A trial
// day is free — the marketing pages say so — and putting a $200/mo total in
// front of someone who asked to try a desk for a day was its own reason to
// abandon the form.
export interface TrialSubmissionInput {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  seating?: string | null;
  // Which plan within that seating — an office size, or a floor desk vs a
  // private one. Only asked for (and only required on) the seatings that
  // offer more than one.
  trial_plan?: string | null;
  trial_date?: string | null;
  agrees_to_terms?: boolean | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateTrialSubmission(
  input: TrialSubmissionInput,
  opts: { today: string }
): string | null {
  if (!String(input.first_name || '').trim()) return 'Please enter your first name.';
  if (!String(input.last_name || '').trim()) return 'Please enter your last name.';
  const email = String(input.email || '').trim();
  if (!email) return 'Please enter your email address.';
  if (!EMAIL_RE.test(email)) return 'Please enter a valid email address.';
  if (!String(input.phone || '').trim()) return 'Please enter a phone number.';
  if (input.seating !== 'desk' && input.seating !== 'office' && input.seating !== 'cafe') {
    return 'Please tell us where you would like to work for the day.';
  }
  const seating: TrialSeating = input.seating;
  const plan = String(input.trial_plan || '').trim();
  if (trialSeatingNeedsPlan(seating)) {
    if (!plan) {
      return seating === 'office'
        ? 'Please choose which size of office you would like to try.'
        : 'Please choose which kind of dedicated desk you would like to try.';
    }
    if (!TRIAL_PLANS_BY_SEATING[seating].includes(plan)) {
      return seating === 'office'
        ? 'Please choose one of the office sizes listed.'
        : 'Please choose one of the desk options listed.';
    }
  } else if (plan && !TRIAL_PLANS_BY_SEATING[seating].includes(plan)) {
    // Seating and plan disagreeing means the form got out of step with
    // itself; refusing beats silently filing the visit under the wrong thing.
    return 'Please tell us where you would like to work for the day.';
  }
  const trialDate = String(input.trial_date || '').trim();
  if (!trialDate) return 'Please choose the day you would like to come in.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trialDate)) return 'Please choose a valid date for your trial day.';
  // Compared as ISO date strings, which sort lexicographically — no timezone
  // maths, and no risk of a Date parse shifting someone's chosen day.
  if (trialDate < opts.today) return 'Please choose a trial day that has not already passed.';
  if (!isWeekdayIsoDate(trialDate)) {
    return 'Trial days run Monday through Friday. Please choose a weekday.';
  }
  if (!input.agrees_to_terms) return 'Please agree to the terms and conditions.';
  return null;
}

// Today in Denver as an ISO date, for the comparison above. The building is
// in Denver, so "has this day passed" is a Denver question — using UTC would
// reject today's date for anyone applying after 5pm local.
export function denverToday(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

// Trial days are weekdays only.
//
// A trial visit is staffed: someone is here to let a trial applicant in, show
// them the floor, and — for an office or the café — have the room open and
// ready. That only happens Monday through Friday, when the building is
// unlocked without an access code. A member with a code can work Sunday
// afternoon; someone who is not a member yet has nobody to let them in.
//
// The day is parsed as UTC rather than local: 'YYYY-MM-DD' through the Date
// constructor is UTC midnight, and reading the weekday back in UTC keeps the
// two ends together. Doing it in local time would move the day by one for
// anyone west of Greenwich and quietly reject Mondays.
export function isWeekdayIsoDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

// The first weekday on or after `date`, for the date picker's `min`. Someone
// filling the form on a Saturday should find Monday offered, not a day the
// validator will refuse.
export function nextWeekdayIsoDate(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = new Date(`${date}T00:00:00Z`);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// The link between a trial day and the membership application it became.
//
// Two rows, in both directions, because staff read the queue from both ends:
//
//   • The TRIAL row carries `converted_to_application_id` — set the moment
//     that person submits a full application off their resume link. Without
//     it the trial card sits in the trial tab looking exactly as it did the
//     day they visited, still offering "Send membership application", while
//     the application they actually completed is one tab over. That is how
//     a submitted application reads as a lost one.
//
//   • The FULL row carries the trial's id and date in
//     `payload.converted_from_trial`, written at insert time. A membership
//     card that says "came in from a trial day on the 12th" is the other
//     half of the same answer, and a JSON key needs no migration.
//
// Both readers fall back to `payload`, like every other reader in this file,
// so a database that is behind on 20260824 still tells the truth.
// ---------------------------------------------------------------------------

export interface TrialOrigin {
  /** id of the trial row this application grew out of, when we know it. */
  application_id: string | null;
  /** The day they came in, for the card. */
  trial_date: string | null;
}

interface ConvertedSource {
  converted_to_application_id?: string | null;
  payload?: Record<string, unknown> | null;
}

/** The full application a trial row turned into, or null if it has not. */
export function readConvertedApplicationId(
  source: ConvertedSource | null | undefined
): string | null {
  if (!source) return null;
  if (typeof source.converted_to_application_id === 'string' && source.converted_to_application_id) {
    return source.converted_to_application_id;
  }
  const fromPayload = (source.payload as { converted_to_application_id?: unknown } | null)
    ?.converted_to_application_id;
  return typeof fromPayload === 'string' && fromPayload ? fromPayload : null;
}

/** The trial day a full application grew out of, or null if it did not. */
export function readTrialOrigin(
  source: { payload?: Record<string, unknown> | null } | null | undefined
): TrialOrigin | null {
  const raw = (source?.payload as { converted_from_trial?: unknown } | null)?.converted_from_trial;
  if (!raw || typeof raw !== 'object') return null;
  const origin = raw as { application_id?: unknown; trial_date?: unknown };
  return {
    application_id:
      typeof origin.application_id === 'string' && origin.application_id
        ? origin.application_id
        : null,
    trial_date:
      typeof origin.trial_date === 'string' && origin.trial_date ? origin.trial_date : null,
  };
}
