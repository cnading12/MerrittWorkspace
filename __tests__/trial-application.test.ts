import { describe, it, expect } from 'vitest';
import {
  MAX_ID_FILE_BYTES,
  denverToday,
  fileNameExtension,
  generateResumeToken,
  isAcceptedIdMimeType,
  isTrialApplication,
  isWeekdayIsoDate,
  nextWeekdayIsoDate,
  readApplicationKind,
  trialIdDocumentPath,
  trialPrefillFrom,
  validateTrialSubmission,
} from '@/lib/portal/trialApplication';
import { PLAN_FOR_TRIAL_SEATING, readTrialSeating } from '@/lib/portal/trialApplication';
import { selectFollowupTargets, isDueFollowup } from '@/lib/portal/trialFollowup';
import { trialConversionEmail, trialResumeUrl } from '@/lib/portal/trialConversionEmail';

// The trial form exists to be short. These tests pin down the two things
// that shortness depends on: that it still refuses a submission missing
// anything we genuinely need, and that everything it does collect survives
// the trip into a full membership application so nobody types it twice.

describe('trial submission validation', () => {
  const valid = {
    first_name: 'Dana',
    last_name: 'Reyes',
    email: 'dana@example.com',
    phone: '303-555-0100',
    seating: 'desk',
    trial_plan: 'dedicated_desk',
    trial_date: '2026-09-14',
    agrees_to_terms: true,
  };
  const today = '2026-09-01';

  it('accepts a complete submission', () => {
    expect(validateTrialSubmission(valid, { today })).toBeNull();
  });

  it('does not require a company', () => {
    expect(validateTrialSubmission({ ...valid, company_name: '' }, { today })).toBeNull();
  });

  // The whole point of the split: none of the full application's vetting
  // fields may creep back in as requirements on this path.
  it('asks for nothing beyond contact details, seating and a date', () => {
    const barest = {
      first_name: 'Dana',
      last_name: 'Reyes',
      email: 'dana@example.com',
      phone: '303-555-0100',
      seating: 'office',
      trial_plan: 'private_office_single',
      trial_date: '2026-09-14',
      agrees_to_terms: true,
    };
    expect(validateTrialSubmission(barest, { today })).toBeNull();
  });

  it.each([
    ['first_name', { first_name: '' }, /first name/i],
    ['last_name', { last_name: '' }, /last name/i],
    ['email', { email: '' }, /email/i],
    ['phone', { phone: '' }, /phone/i],
    ['seating', { seating: '' }, /where you would like to work/i],
    ['trial_date', { trial_date: '' }, /day you would like to come in/i],
    ['terms', { agrees_to_terms: false }, /terms/i],
  ])('rejects a missing %s', (_label, override, expected) => {
    expect(validateTrialSubmission({ ...valid, ...override }, { today })).toMatch(expected);
  });

  it('rejects a malformed email', () => {
    expect(validateTrialSubmission({ ...valid, email: 'dana@' }, { today })).toMatch(/valid email/i);
  });

  it('rejects a trial day that has already passed', () => {
    expect(validateTrialSubmission({ ...valid, trial_date: '2026-08-31' }, { today })).toMatch(
      /already passed/i
    );
  });

  it('accepts today itself', () => {
    expect(validateTrialSubmission({ ...valid, trial_date: today }, { today })).toBeNull();
  });

  it.each([
    ['desk', 'dedicated_desk'],
    ['desk', 'private_dedicated_desk'],
    ['office', 'private_office_single'],
    ['office', 'private_office_double'],
    ['office', 'private_office_large'],
    ['cafe', 'cafe_membership'],
  ])('accepts %s as a place to work, trying %s', (seating, trial_plan) => {
    expect(validateTrialSubmission({ ...valid, seating, trial_plan }, { today })).toBeNull();
  });

  // The café is one thing, so it is the one seating that never asks a second
  // question — a submission with no plan against it is complete.
  it('does not ask the café to pick a size', () => {
    expect(
      validateTrialSubmission({ ...valid, seating: 'cafe', trial_plan: '' }, { today })
    ).toBeNull();
  });

  it('asks an office applicant which size', () => {
    expect(
      validateTrialSubmission({ ...valid, seating: 'office', trial_plan: '' }, { today })
    ).toMatch(/which size of office/i);
  });

  it('asks a desk applicant which kind', () => {
    expect(
      validateTrialSubmission({ ...valid, seating: 'desk', trial_plan: '' }, { today })
    ).toMatch(/which kind of dedicated desk/i);
  });

  // Seating and plan disagreeing means the form got out of step with itself.
  // Filing the visit under the wrong room is worse than asking again.
  it('rejects a plan from another seating', () => {
    expect(
      validateTrialSubmission(
        { ...valid, seating: 'office', trial_plan: 'dedicated_desk' },
        { today }
      )
    ).toMatch(/office sizes listed/i);
    expect(
      validateTrialSubmission(
        { ...valid, seating: 'cafe', trial_plan: 'private_office_large' },
        { today }
      )
    ).toMatch(/where you would like to work/i);
  });

  it('rejects an unrecognised seating value', () => {
    expect(validateTrialSubmission({ ...valid, seating: 'penthouse' }, { today })).toMatch(
      /where you would like to work/i
    );
  });

  // A trial visit is staffed — someone lets the visitor in and, for an
  // office or the café, has the room ready. That is a weekday thing.
  it.each([
    ['Saturday', '2026-09-12'],
    ['Sunday', '2026-09-13'],
  ])('rejects a %s', (_label, trial_date) => {
    expect(validateTrialSubmission({ ...valid, trial_date }, { today })).toMatch(
      /Monday through Friday/i
    );
  });

  it.each([
    ['Monday', '2026-09-14'],
    ['Friday', '2026-09-18'],
  ])('accepts a %s', (_label, trial_date) => {
    expect(validateTrialSubmission({ ...valid, trial_date }, { today })).toBeNull();
  });

  // Order matters: a weekend that has also passed should read as passed,
  // which is the thing the person can see for themselves.
  it('still reports a past date as past, weekend or not', () => {
    expect(validateTrialSubmission({ ...valid, trial_date: '2026-08-29' }, { today })).toMatch(
      /already passed/i
    );
  });
});

describe('weekday helpers', () => {
  // Parsed as UTC at both ends. Local parsing would shift the day west of
  // Greenwich and start rejecting Mondays.
  it('reads the weekday off an ISO date', () => {
    expect(isWeekdayIsoDate('2026-09-14')).toBe(true); // Monday
    expect(isWeekdayIsoDate('2026-09-18')).toBe(true); // Friday
    expect(isWeekdayIsoDate('2026-09-19')).toBe(false); // Saturday
    expect(isWeekdayIsoDate('2026-09-20')).toBe(false); // Sunday
    expect(isWeekdayIsoDate('not-a-date')).toBe(false);
  });

  it('moves the picker floor forward off a weekend', () => {
    expect(nextWeekdayIsoDate('2026-09-19')).toBe('2026-09-21'); // Sat -> Mon
    expect(nextWeekdayIsoDate('2026-09-20')).toBe('2026-09-21'); // Sun -> Mon
    expect(nextWeekdayIsoDate('2026-09-18')).toBe('2026-09-18'); // Friday stands
  });
});

describe('denverToday', () => {
  // The building is in Denver. Someone applying at 6pm Denver time on the
  // 14th is on 05:00Z on the 15th; using UTC would reject the 14th as past.
  it('reports the Denver calendar day, not the UTC one', () => {
    expect(denverToday(new Date('2026-09-15T05:00:00Z'))).toBe('2026-09-14');
  });

  it('rolls over once Denver reaches midnight', () => {
    expect(denverToday(new Date('2026-09-15T07:00:00Z'))).toBe('2026-09-15');
  });
});

describe('photo ID handling', () => {
  it('accepts phone photos and PDFs', () => {
    expect(isAcceptedIdMimeType('image/jpeg')).toBe(true);
    expect(isAcceptedIdMimeType('image/heic')).toBe(true);
    expect(isAcceptedIdMimeType('application/pdf')).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isAcceptedIdMimeType('application/zip')).toBe(false);
    expect(isAcceptedIdMimeType('text/html')).toBe(false);
    expect(isAcceptedIdMimeType('')).toBe(false);
    expect(isAcceptedIdMimeType(null)).toBe(false);
  });

  // The ceiling is a request-body limit, not a storage one: a multipart POST
  // over ~4.5MB is rejected by the platform before the route runs, so an ID
  // that passes this check has to fit inside that with room to spare.
  it('keeps the size ceiling under the request-body limit', () => {
    expect(MAX_ID_FILE_BYTES).toBeLessThan(4.5 * 1024 * 1024);
  });

  it('derives a safe extension', () => {
    expect(fileNameExtension('licence.JPG')).toBe('jpg');
    expect(fileNameExtension('scan.pdf')).toBe('pdf');
    expect(fileNameExtension('no-extension')).toBe('bin');
    expect(fileNameExtension('trailing.')).toBe('bin');
    expect(fileNameExtension('weird.j p g!')).toBe('jpg');
  });

  // The prefix is what keeps these files out of reach of the member
  // self-read storage policies, which match on the first path segment being
  // a members.id UUID.
  it('files the ID under a prefix no member id can collide with', () => {
    const path = trialIdDocumentPath('11111111-2222-3333-4444-555555555555', 'id.png', 1756000000000);
    expect(path.startsWith('trial-applications/')).toBe(true);
    expect(path).toBe(
      'trial-applications/11111111-2222-3333-4444-555555555555/photo_id-1756000000000.png'
    );
  });
});

describe('resume tokens', () => {
  it('are long and unguessable', () => {
    const token = generateResumeToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('do not repeat', () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateResumeToken()));
    expect(tokens.size).toBe(50);
  });
});

describe('application kind', () => {
  it('reads the dedicated column when present', () => {
    expect(readApplicationKind({ application_kind: 'trial' })).toBe('trial');
    expect(readApplicationKind({ application_kind: 'full' })).toBe('full');
  });

  // Rows written before 20260824_trial_application_split.sql is applied keep
  // the kind in payload; the column wins once it exists.
  it('falls back to the payload when the column is missing', () => {
    expect(readApplicationKind({ payload: { application_kind: 'trial' } })).toBe('trial');
  });

  it('treats an unmarked row as a full application', () => {
    expect(readApplicationKind({})).toBe('full');
    expect(readApplicationKind(null)).toBe('full');
    expect(readApplicationKind({ payload: {} })).toBe('full');
  });

  // A pre-split full application that ticked the old trial-day radio is NOT
  // a short-form trial: it has references and a plan, and stays approvable.
  it('does not mistake a legacy trial-flagged full application for a trial', () => {
    expect(isTrialApplication({ payload: { wants_trial_day: true } })).toBe(false);
  });
});

describe('prefill carried into the full application', () => {
  const row = {
    first_name: 'Dana',
    last_name: 'Reyes',
    email: 'dana@example.com',
    phone: '303-555-0100',
    company_name: 'Reyes Design',
    trial_date: '2026-09-14',
    id_document_path: 'trial-applications/abc/photo_id-1.png',
    payload: { trial_seating: 'office', trial_plan: 'private_office_double' },
  };

  it('carries every field the trial form collected', () => {
    expect(trialPrefillFrom(row)).toEqual({
      first_name: 'Dana',
      last_name: 'Reyes',
      email: 'dana@example.com',
      phone: '303-555-0100',
      company_name: 'Reyes Design',
      seating: 'office',
      plan: 'private_office_double',
      trial_date: '2026-09-14',
      has_id_document: true,
    });
  });

  // Trial rows written before the form asked which office size fall back to
  // the seating's default plan rather than coming back empty — the full
  // application still opens with something sensible selected.
  it('falls back to the seating default when no plan was recorded', () => {
    const legacy = { ...row, payload: { trial_seating: 'office' } };
    expect(trialPrefillFrom(legacy).plan).toBe('private_office_single');
  });

  // A plan that does not belong to the recorded seating is a mismatch we
  // never write, so reading one back means the row was edited by hand.
  it('ignores a plan that does not match the seating', () => {
    const mismatched = { ...row, payload: { trial_seating: 'cafe', trial_plan: 'private_office_large' } };
    expect(trialPrefillFrom(mismatched).plan).toBe('cafe_membership');
  });

  // The path itself is a storage location behind a bearer token; the form
  // only ever needs to know whether one exists.
  it('reports the ID as on file without exposing where it lives', () => {
    expect(JSON.stringify(trialPrefillFrom(row))).not.toContain('photo_id-1.png');
  });

  it('reports no ID when none was attached', () => {
    expect(trialPrefillFrom({ ...row, id_document_path: null }).has_id_document).toBe(false);
  });

  it('defaults to a desk when seating was not recorded', () => {
    expect(trialPrefillFrom({ ...row, payload: {} }).seating).toBe('desk');
  });

  it('falls back to the trial date in payload', () => {
    expect(
      trialPrefillFrom({ ...row, trial_date: null, payload: { trial_date: '2026-09-14' } }).trial_date
    ).toBe('2026-09-14');
  });
});

describe('post-trial follow-up selection', () => {
  const base = {
    id: 'row-1',
    first_name: 'Dana',
    email: 'dana@example.com',
    trial_date: '2026-09-14',
    resume_token: 'a'.repeat(64),
    application_kind: 'trial',
    conversion_email_sent_at: null,
    converted_to_application_id: null,
    payload: { trial_seating: 'desk' },
  };
  const today = '2026-09-15';

  it('emails someone the day after their visit', () => {
    expect(isDueFollowup(base, today)).toBe(true);
  });

  // Asking "how was it?" while they are still sitting there is worse than
  // not asking at all.
  it('leaves today’s visitors alone', () => {
    expect(isDueFollowup({ ...base, trial_date: today }, today)).toBe(false);
  });

  it('leaves future visitors alone', () => {
    expect(isDueFollowup({ ...base, trial_date: '2026-09-20' }, today)).toBe(false);
  });

  // The dedupe that stops a daily cron nagging the same person forever.
  it('never emails the same person twice', () => {
    expect(
      isDueFollowup({ ...base, conversion_email_sent_at: '2026-09-15T17:00:00Z' }, today)
    ).toBe(false);
  });

  it('stops chasing someone who already applied', () => {
    expect(isDueFollowup({ ...base, converted_to_application_id: 'row-2' }, today)).toBe(false);
  });

  it('ignores full membership applications', () => {
    expect(isDueFollowup({ ...base, application_kind: 'full' }, today)).toBe(false);
  });

  // A follow-up without a token links to an empty 40-field form — the exact
  // thing this work removes. Better to skip and let staff send it by hand.
  it('skips rows with no resume token', () => {
    expect(isDueFollowup({ ...base, resume_token: null }, today)).toBe(false);
  });

  it('skips rows with no email or no trial date', () => {
    expect(isDueFollowup({ ...base, email: null }, today)).toBe(false);
    expect(isDueFollowup({ ...base, trial_date: null, payload: {} }, today)).toBe(false);
  });

  it('maps due rows into send targets', () => {
    const targets = selectFollowupTargets(
      [base, { ...base, id: 'row-2', trial_date: '2026-09-20' }],
      today
    );
    expect(targets).toEqual([
      {
        id: 'row-1',
        email: 'dana@example.com',
        firstName: 'Dana',
        trialDate: '2026-09-14',
        resumeToken: 'a'.repeat(64),
        seating: 'desk',
      },
    ]);
  });
});

describe('conversion email', () => {
  const token = 'b'.repeat(64);

  it('links to the prefilled application, not a blank one', () => {
    const url = trialResumeUrl(token);
    expect(url).toContain('/membership/apply?resume=');
    expect(url).toContain(token);
    // An absolute URL — a relative link in an email is dead on arrival.
    expect(url.startsWith('http')).toBe(true);
  });

  it('tells them their details carried over, in both bodies', () => {
    const { html, text, subject } = trialConversionEmail({
      firstName: 'Dana',
      trialDate: '2026-09-14',
      resumeToken: token,
      seating: 'desk',
    });
    expect(subject).toMatch(/trial day/i);
    for (const body of [html, text]) {
      expect(body).toContain('Dana');
      expect(body).toContain(trialResumeUrl(token));
      expect(body).toMatch(/nothing to type twice/i);
      expect(body).toMatch(/dedicated desk/i);
    }
  });

  it('names the private office for an office trial', () => {
    const { html, text } = trialConversionEmail({
      firstName: 'Dana',
      trialDate: '2026-09-14',
      resumeToken: token,
      seating: 'office',
    });
    for (const body of [html, text]) {
      expect(body).toMatch(/private office/i);
    }
  });

  // A date-only string must not shift a day when rendered.
  it('renders the trial date without a timezone shift', () => {
    const { text } = trialConversionEmail({
      firstName: 'Dana',
      trialDate: '2026-09-14',
      resumeToken: token,
      seating: 'desk',
    });
    expect(text).toContain('September 14');
  });

  it('copes with an unknown trial date', () => {
    const { text } = trialConversionEmail({
      firstName: '',
      trialDate: null,
      resumeToken: token,
      seating: 'desk',
    });
    expect(text).toContain('your recent visit');
    expect(text).toContain('Hi,');
  });
});

describe('café as a place to trial', () => {
  // A café member works from the 1905 building next door, not the coworking
  // floor. The seating answer is what carries that all the way to the email.
  it('maps each seating answer to the tier it would sell', () => {
    expect(PLAN_FOR_TRIAL_SEATING).toEqual({
      desk: 'dedicated_desk',
      office: 'private_office_single',
      cafe: 'cafe_membership',
    });
  });

  it('reads a stored café answer back', () => {
    expect(readTrialSeating('cafe')).toBe('cafe');
    expect(readTrialSeating('office')).toBe('office');
    expect(readTrialSeating('desk')).toBe('desk');
  });

  // An unrecognised value must land on the desk instructions, which are the
  // ones that make sense to someone standing in the coworking building.
  it('falls back to a desk for anything it does not recognise', () => {
    expect(readTrialSeating(undefined)).toBe('desk');
    expect(readTrialSeating('penthouse')).toBe('desk');
    expect(readTrialSeating(null)).toBe('desk');
  });

  it('carries the café answer into the prefill', () => {
    expect(
      trialPrefillFrom({
        first_name: 'Dana',
        email: 'dana@example.com',
        payload: { trial_seating: 'cafe' },
      }).seating
    ).toBe('cafe');
  });

  it('names the café in the conversion email', () => {
    const { html, text } = trialConversionEmail({
      firstName: 'Dana',
      trialDate: '2026-09-14',
      resumeToken: 'c'.repeat(64),
      seating: 'cafe',
    });
    for (const body of [html, text]) {
      expect(body).toMatch(/café/i);
      expect(body).not.toMatch(/dedicated desk/i);
    }
  });
});
