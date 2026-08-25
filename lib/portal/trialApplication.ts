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

export const MAX_ID_FILE_BYTES = 10 * 1024 * 1024;

// Mirrors the accept attribute on the upload input. Kept permissive on the
// image side — people photograph their licence with whatever phone they have
// — but a document upload has no reason to be an executable or an archive.
export const ACCEPTED_ID_MIME_PREFIXES = ['image/'];
export const ACCEPTED_ID_MIME_TYPES = ['application/pdf'];

export function isAcceptedIdMimeType(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  const type = mimeType.toLowerCase();
  return (
    ACCEPTED_ID_MIME_PREFIXES.some((prefix) => type.startsWith(prefix)) ||
    ACCEPTED_ID_MIME_TYPES.includes(type)
  );
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

// Narrow a stored seating value. Anything unrecognised — an older row, a
// tier that no longer exists — reads as a desk, which is the variant whose
// instructions are safe for someone standing in the coworking building.
export function readTrialSeating(value: unknown): TrialSeating {
  if (value === 'office' || value === 'cafe') return value;
  return 'desk';
}

// The plan a trial applicant should find preselected when they come back to
// apply for real.
export const PLAN_FOR_TRIAL_SEATING: Record<TrialSeating, string> = {
  desk: 'dedicated_desk',
  office: 'private_office_single',
  cafe: 'cafe_membership',
};

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
  const payload = (row.payload || {}) as { trial_seating?: unknown; trial_date?: unknown };
  const seating: TrialSeating = readTrialSeating(payload.trial_seating);
  const trialDate =
    row.trial_date || (typeof payload.trial_date === 'string' ? payload.trial_date : null);
  return {
    first_name: row.first_name || '',
    last_name: row.last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    company_name: row.company_name || '',
    seating,
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
  const trialDate = String(input.trial_date || '').trim();
  if (!trialDate) return 'Please choose the day you would like to come in.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trialDate)) return 'Please choose a valid date for your trial day.';
  // Compared as ISO date strings, which sort lexicographically — no timezone
  // maths, and no risk of a Date parse shifting someone's chosen day.
  if (trialDate < opts.today) return 'Please choose a trial day that has not already passed.';
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
