import { describe, it, expect } from 'vitest';
import {
  applicationReceivedSubject,
  generateApplicationReceivedEmailHTML,
  generateApplicationReceivedEmailText,
  type ApplicationTrialState,
} from '@/lib/portal/applicationReceivedEmail';

// The confirmation that goes out the moment a membership application lands.
//
// The bug these tests exist to prevent is the one this email shipped with for
// a year: a numbered "what's next" list promising every applicant a tour, an
// introduction to the team and a free trial day — sent, most of the time, to
// someone who had just had all three and was writing to say they wanted to
// join. Whatever else changes here, the email must never tell a person who has
// already spent a day in the building that a day in the building is coming.

const base = {
  firstName: 'Dana',
  lastName: 'Ruiz',
  email: 'dana@example.com',
  membershipType: 'Dedicated Desk',
  submittedAt: new Date('2026-09-14T16:30:00Z'),
};

// Both bodies, every time. A plain-text part that quietly says something the
// HTML doesn't is a real bug — plenty of clients only ever render the text.
const render = (trial: ApplicationTrialState) => {
  const data = { ...base, trial };
  return {
    html: generateApplicationReceivedEmailHTML(data),
    text: generateApplicationReceivedEmailText(data),
  };
};

describe('application-received email — the trial branch', () => {
  it('thanks a converting trial visitor for the day they already spent here', () => {
    const { html, text } = render({ kind: 'completed', trialDate: '2026-09-14' });

    for (const body of [html, text]) {
      expect(body).toMatch(/Thanks for spending Monday, September 14 with us/);
      // The whole point: a visit already had is never offered again. The one
      // permitted mention of the trial day is in the past tense, about the
      // details that carried across from it.
      expect(body).not.toMatch(/free trial day/i);
      expect(body).not.toMatch(/tour/i);
      expect(body).toMatch(/gave us on your trial day came across/i);
    }
  });

  it('falls back to a phrase rather than a wrong date when the trial date is unknown', () => {
    const { html, text } = render({ kind: 'completed', trialDate: null });

    for (const body of [html, text]) {
      expect(body).toMatch(/Thanks for spending your trial day with us/);
      expect(body).not.toMatch(/Invalid Date|NaN|undefined|null/);
    }
  });

  it('points an upcoming trial visitor at the separate email instead of repeating it', () => {
    const { html, text } = render({ kind: 'upcoming', trialDate: '2026-09-14' });

    for (const body of [html, text]) {
      expect(body).toMatch(/Your trial day on Monday, September 14 is booked/);
      expect(body).toMatch(/separate email/i);
      // The details of the visit live in lib/portal/trialDayEmail.ts. Two
      // emails describing where to sit is how they end up disagreeing.
      expect(body).not.toMatch(/where to sit,/i);
    }
  });

  it('offers a tour or a trial day only to someone who has never been here', () => {
    const { html, text } = render({ kind: 'none' });

    for (const body of [html, text]) {
      expect(body).toMatch(/we'll set up a tour, or a free trial day/i);
    }
  });

  it('renders a date-only trial date on its own day in any timezone', () => {
    // Parsed at UTC noon, so a mail server west of Denver cannot roll it back
    // to the 13th.
    const { text } = render({ kind: 'completed', trialDate: '2026-09-14' });
    expect(text).toMatch(/September 14/);
    expect(text).not.toMatch(/September 13|September 15/);
  });
});

describe('application-received email — what it no longer says', () => {
  const everyVariant: ApplicationTrialState[] = [
    { kind: 'completed', trialDate: '2026-09-14' },
    { kind: 'upcoming', trialDate: '2026-09-14' },
    { kind: 'none' },
  ];

  it('never prints a "what\'s next" checklist of things we do not do', () => {
    for (const trial of everyVariant) {
      const { html, text } = render(trial);
      for (const body of [html, text]) {
        expect(body).not.toMatch(/What's Next/i);
        expect(body).not.toMatch(/Meet the Team/i);
        expect(body).not.toMatch(/burnt orange floors/i);
      }
    }
  });

  it('never prints an Application ID nobody can look up', () => {
    // `APP-<timestamp>` is minted per request and never written to the row, so
    // an applicant quoting one back to the desk matches nothing.
    for (const trial of everyVariant) {
      const { html, text } = render(trial);
      for (const body of [html, text]) {
        expect(body).not.toMatch(/Application ID/i);
        expect(body).not.toMatch(/APP-\d/);
      }
    }
  });

  it('never re-sells the amenities to someone who has already applied', () => {
    for (const trial of everyVariant) {
      const { html, text } = render(trial);
      for (const body of [html, text]) {
        expect(body).not.toMatch(/High-speed WiFi/i);
        expect(body).not.toMatch(/3 minutes to I-25/i);
      }
    }
  });
});

describe('application-received email — what it must still say', () => {
  const everyVariant: ApplicationTrialState[] = [
    { kind: 'completed', trialDate: '2026-09-14' },
    { kind: 'upcoming', trialDate: '2026-09-14' },
    { kind: 'none' },
  ];

  it('states the review window and what an approval brings, in one line', () => {
    for (const trial of everyVariant) {
      const { html, text } = render(trial);
      for (const body of [html, text]) {
        expect(body).toMatch(/1–2 business days/);
        expect(body).toMatch(/email you either way/i);
        expect(body).toMatch(/member portal/i);
      }
    }
  });

  it('confirms back what they applied for', () => {
    for (const trial of everyVariant) {
      const { html, text } = render(trial);
      for (const body of [html, text]) {
        expect(body).toContain('Dana Ruiz');
        expect(body).toContain('dana@example.com');
        expect(body).toContain('Dedicated Desk');
      }
    }
  });

  it('carries the logo band and the business contact details', () => {
    const { html, text } = render({ kind: 'none' });

    expect(html).toContain('/images/brand/logo.png');
    expect(html).toContain('alt="Merritt Workspace"');
    for (const body of [html, text]) {
      expect(body).toContain('memberservices@merrittworkspace.net');
      expect(body).toContain('(303) 359-8337');
      expect(body).toContain('2246 Irving Street, Denver, CO 80211');
    }
  });

  it('keeps the subject line stable', () => {
    expect(applicationReceivedSubject()).toBe('Membership Application Received | Merritt Workspace');
  });
});
