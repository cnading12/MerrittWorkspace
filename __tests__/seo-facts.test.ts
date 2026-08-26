import { describe, it, expect } from 'vitest';
import robots from '@/app/robots';
import { buildLlmsFullTxt, buildLlmsTxt } from '@/lib/seo/llms';
import { BUSINESS, FLEX_SPACE, MEETING_ROOM, PLANS, SITE_URL } from '@/lib/seo/business';
import { FAQS } from '@/lib/seo/faqs';
import { ACCESS_CODE_WHEN_NEEDED, BUSINESS_HOURS_FULL } from '@/lib/hours';

// These guard the machine-readable surfaces — robots.txt, /llms.txt, the FAQ
// data behind the FAQPage markup. Their whole value is that a crawler or an AI
// assistant finds one set of facts, so what has to hold is: the AI crawlers are
// not locked out, the private routes are, every price and the address really
// appear in the generated text, and nothing in the FAQ answers contradicts the
// prices in the plan table.

describe('robots.txt', () => {
  const rules = robots().rules as { userAgent: string; disallow?: string[] }[];
  const agents = rules.map(r => r.userAgent);

  it('names the crawlers behind the major assistants', () => {
    for (const agent of ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended']) {
      expect(agents).toContain(agent);
    }
  });

  it('lets every named crawler reach the marketing pages', () => {
    for (const rule of rules) {
      expect(rule.disallow).not.toContain('/');
      // A disallow of the membership or FAQ tree would silently cost us the
      // pages that answer a recommendation question.
      expect(rule.disallow ?? []).not.toContain('/membership/');
      expect(rule.disallow ?? []).not.toContain('/member-resources/');
    }
  });

  it('keeps staff and transactional routes out of every crawl', () => {
    for (const rule of rules) {
      expect(rule.disallow).toContain('/admin/');
      expect(rule.disallow).toContain('/api/');
    }
  });

  it('leaves /portal/ crawlable so its noindex can be read', () => {
    for (const rule of rules) {
      expect(rule.disallow ?? []).not.toContain('/portal/');
    }
  });
});

describe('/llms.txt', () => {
  const txt = buildLlmsTxt();

  it('leads with the name and a summary', () => {
    expect(txt.startsWith(`# ${BUSINESS.name}`)).toBe(true);
    expect(txt).toContain('> ');
  });

  it('carries the address and phone number', () => {
    expect(txt).toContain(BUSINESS.address.full);
    expect(txt).toContain(BUSINESS.telephoneDisplay);
  });

  it('quotes every plan price', () => {
    for (const plan of PLANS) {
      expect(txt).toContain(`$${plan.price}`);
    }
  });

  it('links pages absolutely, so a quoted line still resolves', () => {
    expect(txt).toContain(`${SITE_URL}/membership`);
    expect(txt).not.toMatch(/\]\(\/(?!\/)/);
  });
});

describe('/llms-full.txt', () => {
  const txt = buildLlmsFullTxt();

  it('includes every FAQ question and answer', () => {
    for (const faq of FAQS) {
      expect(txt).toContain(faq.question);
      // First line of the answer, which is enough to prove the body landed.
      expect(txt).toContain(faq.answer.split('\n')[0]);
    }
  });

  it('states the conference room rate and that non-members may book', () => {
    expect(txt).toContain(`$${MEETING_ROOM.hourlyRate} per hour`);
    expect(txt.toLowerCase()).toContain('open to non-members: yes');
  });

  it('states the flex hall rate for non-members, and where they book it', () => {
    expect(txt).toContain(`$${FLEX_SPACE.publicHourlyRate} per hour`);
    expect(txt).toContain(FLEX_SPACE.publicBookingUrl);
  });

  it('keeps 24/7 member access and the unlocked-door window apart', () => {
    expect(txt).toContain(BUSINESS.hours.memberAccess);
    expect(txt).toContain(BUSINESS.hours.business);
    expect(txt).toContain(BUSINESS.hours.accessCodeNeeded);
  });
});

describe('fact consistency', () => {
  it('quotes the door policy from lib/hours, not a second copy of it', () => {
    expect(BUSINESS.hours.business).toContain(BUSINESS_HOURS_FULL);
    expect(BUSINESS.hours.accessCodeNeeded).toContain(ACCESS_CODE_WHEN_NEEDED);
    expect(buildLlmsFullTxt()).toContain(BUSINESS_HOURS_FULL);
  });

  it('never quotes a membership price the plan table does not have', () => {
    const known = new Set(PLANS.map(p => `$${p.price}`));
    known.add(`$${MEETING_ROOM.hourlyRate}`); // hourly room rate
    known.add(`$${FLEX_SPACE.publicHourlyRate}`); // flex hall, rented by a non-member
    known.add('$250'); // unreturned key fee, from the terms
    known.add('$1,200'); // large office, written with a separator in prose

    // Trailing punctuation rides along in prose ("$700, and ..."), so trim it.
    const quoted = FAQS.flatMap(f => f.answer.match(/\$[\d,]+/g) ?? []).map(p => p.replace(/,+$/, ''));
    for (const price of quoted) {
      expect(known.has(price), `FAQ quotes ${price}, which no plan or rate matches`).toBe(true);
    }
  });

  it('agrees with the plan table about included conference room hours', () => {
    const pricing = FAQS.find(f => f.id === 'conference-room-non-members')!;
    for (const plan of PLANS) {
      if (plan.meetingCreditPerMonth === null) continue;
      expect(pricing.answer).toContain(String(plan.meetingCreditPerMonth));
    }
  });

  it('gives every FAQ a unique id', () => {
    expect(new Set(FAQS.map(f => f.id)).size).toBe(FAQS.length);
  });
});
