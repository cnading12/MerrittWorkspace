import { describe, it, expect } from 'vitest';
import {
  generateTrialDayEmailHTML,
  generateTrialDayEmailText,
} from '@/lib/portal/trialDayEmail';

// The trial-day email is the only instructions a first-time visitor gets
// before they walk into an unstaffed building. These tests guard the two
// things they can't work out on their own: which desk is actually theirs for
// the day, and how to tell a phone booth from an office or a bathroom.

const base = { firstName: 'Dana', trialDate: '2026-09-14' };

// Render both bodies so every assertion covers the HTML and the plain-text
// alternative — a text part that quietly drops the desk list is a real bug.
const render = (data: Parameters<typeof generateTrialDayEmailHTML>[0]) => ({
  html: generateTrialDayEmailHTML(data),
  text: generateTrialDayEmailText(data),
});

describe('trial-day email — where you sit', () => {
  it('lists the free desks for a desk trial', () => {
    const { html, text } = render({ ...base, availableDesksLabel: 'DD1–DD4, DD9' });

    expect(html).toContain('DD1–DD4, DD9');
    expect(text).toContain('DD1–DD4, DD9');
    for (const body of [html, text]) {
      expect(body).toMatch(/Where you'll sit/i);
      // Free desks means no reason to send them chasing a team member.
      expect(body).not.toMatch(/currently spoken for/i);
    }
  });

  it('sends the visitor to a team member when no desk is free', () => {
    const { html, text } = render({ ...base, allDesksTaken: true });

    for (const body of [html, text]) {
      expect(body).toMatch(/currently spoken for/i);
      expect(body).toMatch(/private office dedicated desk/i);
      expect(body).toMatch(/confirm with a Merritt team member/i);
      expect(body).toContain('memberservices@merrittworkspace.net');
      expect(body).toContain('(303) 359-8337');
    }
  });

  it('falls back to generic guidance when availability is unknown', () => {
    // The availability lookup is best-effort; on failure the email must not
    // claim desks are free, nor that they are all taken.
    const { html, text } = render(base);

    for (const body of [html, text]) {
      expect(body).toMatch(/completely empty/i);
      expect(body).not.toMatch(/currently spoken for/i);
    }
  });

  it('mentions what comes with every desk in each desk variant', () => {
    const variants = [
      { ...base, availableDesksLabel: 'DD7' },
      { ...base, allDesksTaken: true },
      base,
    ];

    for (const data of variants) {
      const { html, text } = render(data);
      expect(html).toMatch(/monitor, filing storage, and a power supply/i);
      expect(text).toMatch(/monitor, filing storage, and a power\s+supply/i);
    }
  });

  it('does not show desk seating to an office trial visitor', () => {
    const { html, text } = render({
      ...base,
      isOfficeTrial: true,
      availableDesksLabel: 'DD1–DD4',
    });

    for (const body of [html, text]) {
      expect(body).not.toContain('DD1–DD4');
      expect(body).not.toMatch(/Where you'll sit/i);
      // Office visitors still get their own confirm-your-office step.
      expect(body).toMatch(/confirm your office/i);
    }
  });
});

describe('trial-day email — finding a phone booth', () => {
  it('explains the unmarked-door rule in every variant', () => {
    const variants = [
      { ...base, availableDesksLabel: 'DD7' },
      { ...base, allDesksTaken: true },
      { ...base, isOfficeTrial: true },
    ];

    for (const data of variants) {
      const { html, text } = render(data);
      for (const body of [html, text]) {
        expect(body).toMatch(/unmarked doors/i);
        expect(body).toMatch(/bathroom door/i);
        // The signs aren't up yet, so the rule has to stand on its own.
        expect(body).toMatch(/signs are on order/i);
      }
    }
  });
});

describe('trial-day email — the café variant', () => {
  const cafe = render({ ...base, isCafeTrial: true });

  // A café trial is the same day out with one thing changed: which building
  // you work from. Everything else has to survive, because "come see the
  // place" is the entire product.
  it('sends them to the 1905 building next door, not the coworking floor', () => {
    for (const body of [cafe.html, cafe.text]) {
      expect(body).toMatch(/1905 building next door/i);
      expect(body).toMatch(/caf[eé] is at the front/i);
    }
  });

  it('tells them the workspace is still theirs all day', () => {
    for (const body of [cafe.html, cafe.text]) {
      expect(body).toMatch(/workspace itself is next door and open to you all day/i);
      expect(body).toMatch(/kitchen/i);
      expect(body).toMatch(/printers/i);
      expect(body).toMatch(/meeting room/i);
      expect(body).toMatch(/phone boot/i);
    }
  });

  it('describes open seating rather than a desk they would not get', () => {
    for (const body of [cafe.html, cafe.text]) {
      expect(body).toMatch(/Where you'll sit/i);
      expect(body).toMatch(/sit wherever is free/i);
      expect(body).toMatch(/open seating/i);
      // No desk numbers, and none of the assigned-desk equipment copy.
      expect(body).not.toMatch(/DD1/);
      expect(body).not.toMatch(/monitor, filing storage/i);
    }
  });

  it('keeps the practical details every trial visitor needs', () => {
    for (const body of [cafe.html, cafe.text]) {
      expect(body).toContain('merrittcowork');
      expect(body).toContain('Merritt23X');
      expect(body).toContain('2246 Irving Street');
      expect(body).toMatch(/coffee, tea,? and beer/i);
      expect(body).toMatch(/snack ?shop/i);
      expect(body).toMatch(/\(303\) 359-8337/);
    }
  });

  it('does not use the office-trial confirmation step', () => {
    for (const body of [cafe.html, cafe.text]) {
      expect(body).not.toMatch(/confirm your office/i);
    }
  });
});

describe('trial-day email — what happens next', () => {
  // The short trial form collects contact details and a photo ID. Promising
  // those people a decision on a membership application they never submitted
  // is the kind of thing that has them waiting on an email that never comes.
  it('promises no review to someone who only booked a trial day', () => {
    const { html, text } = render({ ...base, hasFullApplication: false });
    for (const body of [html, text]) {
      expect(body).not.toMatch(/being reviewed in parallel/i);
      expect(body).not.toMatch(/1–2 business days/i);
      expect(body).toMatch(/nothing else to fill in before your visit/i);
      expect(body).toMatch(/already given us filled in/i);
    }
  });

  it('still says so when they did submit a full application', () => {
    const { html, text } = render({ ...base, hasFullApplication: true });
    for (const body of [html, text]) {
      expect(body).toMatch(/being reviewed in parallel/i);
      expect(body).toMatch(/1–2 business days/i);
    }
  });
});
