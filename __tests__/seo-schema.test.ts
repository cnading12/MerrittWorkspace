import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  OFFERS,
  ORGANIZATION_ID,
  breadcrumbNode,
  faqPageNode,
  graph,
  organizationNode,
  serviceNode,
  webPageNode,
  webSiteNode,
} from '@/lib/seo/schema';
import { PRICES, SITE_URL } from '@/lib/seo/site';
import { DAY_PASS_FAQS, FAQS } from '@/lib/seo/faqs';
import { MEMBERSHIP_PLANS } from '@/lib/portal/pricing';

const root = join(__dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('advertised prices match what we actually charge', () => {
  // Structured data is a claim to Google about what things cost. Google cross
  // checks it against the page, and a mismatch has already happened once here
  // (the schema said $300 for a desk while every page said $200). These bind
  // the SEO price list to the billing price list so it cannot happen silently.
  const cases: [keyof typeof PRICES, string][] = [
    ['dedicatedDesk', 'dedicated_desk'],
    ['privateDedicatedDesk', 'private_dedicated_desk'],
    ['dayPass', 'one_day_dedicated_desk'],
    ['privateOfficeSingle', 'private_office_single'],
    ['privateOfficeDouble', 'private_office_double'],
    ['privateOfficeLarge', 'private_office_large'],
  ];

  it.each(cases)('%s matches MEMBERSHIP_PLANS.%s', (seoKey, planId) => {
    expect(PRICES[seoKey] * 100).toBe(MEMBERSHIP_PLANS[planId].monthly_cost_cents);
  });

  it('quotes the same conference room rate the booking page charges', () => {
    const page = read('app/member-resources/meeting-rooms/page.tsx');
    const match = page.match(/const HOURLY_RATE = (\d+);/);
    expect(match).not.toBeNull();
    expect(Number(match![1])).toBe(PRICES.conferenceHourly);
  });
});

describe('organization node', () => {
  const org = organizationNode();

  it('is the one node everything else references', () => {
    expect(org['@id']).toBe(ORGANIZATION_ID);
    expect(org['@type']).toBe('CoworkingSpace');
  });

  it('carries a complete postal address, because local ranking depends on it', () => {
    for (const field of [
      'streetAddress',
      'addressLocality',
      'addressRegion',
      'postalCode',
      'addressCountry',
    ]) {
      expect(org.address[field], `address.${field}`).toBeTruthy();
    }
    expect(org.telephone).toMatch(/^\+1-\d{3}-\d{3}-\d{4}$/);
  });

  it('offers every sellable plan, priced in whole dollars', () => {
    const names = OFFERS.map((o) => o.name);
    expect(names).toContain('Day Pass — Dedicated Desk');
    expect(names).toContain('Dedicated Desk');
    expect(names).toContain('Conference Room Rental');
    for (const o of OFFERS) {
      expect(Number(o.price), o.name).toBeGreaterThan(0);
      expect(o.priceCurrency).toBe('USD');
      expect(o.itemOffered.provider['@id']).toBe(ORGANIZATION_ID);
    }
  });

  it('uses absolute URLs for every image, as JSON-LD requires', () => {
    for (const url of org.image as string[]) {
      expect(url.startsWith(`${SITE_URL}/`), url).toBe(true);
    }
  });
});

describe('breadcrumbs', () => {
  it('start at Home and number from 1 without gaps', () => {
    const node = breadcrumbNode([
      { name: 'Membership', path: '/membership' },
      { name: 'Dedicated Desk', path: '/membership/dedicated-desk' },
    ]);
    expect(node.itemListElement.map((i: { name: string }) => i.name)).toEqual([
      'Home',
      'Membership',
      'Dedicated Desk',
    ]);
    expect(node.itemListElement.map((i: { position: number }) => i.position)).toEqual([1, 2, 3]);
    for (const item of node.itemListElement) {
      expect(item.item.startsWith(SITE_URL), item.item).toBe(true);
    }
  });
});

describe('serviceNode', () => {
  it('reuses catalog offers so a product page cannot quote its own price', () => {
    const node = serviceNode({
      path: '/day-pass',
      name: 'Coworking Day Pass',
      description: 'x',
      offerNames: ['Day Pass — Dedicated Desk'],
    });
    expect(node.offers.price).toBe(String(PRICES.dayPass));
  });

  it('refuses to build against an offer that does not exist', () => {
    expect(() =>
      serviceNode({ path: '/x', name: 'x', description: 'x', offerNames: ['Nope'] }),
    ).toThrow(/unknown offer name/);
  });
});

describe('FAQ structured data', () => {
  it('mirrors every question rendered on the FAQ page', () => {
    // The page builds its answers out of JSX, which cannot go into JSON-LD, so
    // lib/seo/faqs.ts restates them as prose. That is only safe while the two
    // cover the same questions — this is the guard that says so.
    const page = read('app/member-resources/faqs/page.tsx');
    // Plain exec loop rather than spreading matchAll: this repo targets ES5,
    // where spreading an iterator needs downlevelIteration.
    const pattern = /^\s+question: '(.+?)',$/gm;
    const rendered: string[] = [];
    for (let m = pattern.exec(page); m !== null; m = pattern.exec(page)) {
      rendered.push(m[1].replace(/\\'/g, "'"));
    }

    expect(rendered.length).toBeGreaterThan(0);
    expect(FAQS.map((f) => f.question).sort()).toEqual(rendered.sort());
  });

  it('answers every question with real prose', () => {
    for (const { question, answer } of [...FAQS, ...DAY_PASS_FAQS]) {
      expect(question.length, question).toBeGreaterThan(10);
      expect(answer.length, question).toBeGreaterThan(40);
      // Markup in an answer is a rich-result violation, not just untidy.
      expect(answer, question).not.toMatch(/<[a-z/]/i);
    }
  });

  it('renders the day pass FAQs it marks up, as Google requires', () => {
    const page = read('app/day-pass/page.tsx');
    expect(page).toContain('DAY_PASS_FAQS');
    const node = faqPageNode('/day-pass', DAY_PASS_FAQS);
    expect(node.mainEntity).toHaveLength(DAY_PASS_FAQS.length);
    expect(node.mainEntity[0]['@type']).toBe('Question');
    expect(node.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
  });
});

describe('the emitted graph', () => {
  it('serializes, and every node is typed and addressable', () => {
    const data = graph([
      organizationNode(),
      webSiteNode(),
      webPageNode({ path: '/day-pass', name: 'Day Pass', description: 'x' }),
      breadcrumbNode([{ name: 'Day Pass', path: '/day-pass' }]),
      faqPageNode('/day-pass', DAY_PASS_FAQS),
    ]);
    const parsed = JSON.parse(JSON.stringify(data));
    expect(parsed['@context']).toBe('https://schema.org');
    for (const node of parsed['@graph']) {
      expect(node['@type'], JSON.stringify(node).slice(0, 80)).toBeTruthy();
      expect(node['@id'], node['@type']).toBeTruthy();
    }
  });

  it('never emits undefined, which JSON.stringify would silently drop', () => {
    expect(JSON.stringify(graph([organizationNode(), webSiteNode()]))).not.toContain('undefined');
  });
});

describe('crawl directives', () => {
  it('does not list a noindexed page in the sitemap', () => {
    // Asking Google to crawl a URL and then telling it not to index the URL is
    // a contradiction Search Console reports as an error.
    const sitemap = read('app/sitemap.ts');
    expect(sitemap).not.toMatch(/path: '\/privacy'/);
    expect(sitemap).not.toMatch(/path: '\/terms'/);
  });

  it('leaves noindexed routes crawlable, so the directive can be read', () => {
    const robots = read('app/robots.ts');
    for (const path of ['/portal', '/admin', '/privacy', '/terms', '/_next']) {
      expect(robots, `${path} must not be disallowed`).not.toContain(`'${path}/'`);
    }
  });

  it('sitemaps every public marketing route', () => {
    const sitemap = read('app/sitemap.ts');
    for (const path of [
      '/',
      '/membership',
      '/membership/dedicated-desk',
      '/membership/private-office',
      '/day-pass',
      '/member-resources/meeting-rooms',
      '/member-resources/flex-space',
      '/member-resources/faqs',
      '/about',
      '/contact',
    ]) {
      expect(sitemap, path).toContain(`path: '${path}'`);
    }
  });
});

describe('page metadata', () => {
  const routes = [
    'app/about',
    'app/contact',
    'app/day-pass',
    'app/membership/(overview)',
    'app/membership/apply',
    'app/membership/dedicated-desk',
    'app/membership/private-office',
    'app/member-resources/faqs',
    'app/member-resources/flex-space',
    'app/member-resources/meeting-rooms',
    'app/member-resources/snackshop',
  ];

  it.each(routes)('%s declares its own canonical', (dir) => {
    expect(read(`${dir}/layout.tsx`)).toContain('canonical');
  });

  it.each(routes)('%s sets its own social card', (dir) => {
    // Without an explicit `twitter` block a route inherits the homepage's, so
    // every link shared anywhere reads "Coworking Space in Sloan's Lake"
    // regardless of what was actually shared.
    const src = read(`${dir}/layout.tsx`);
    expect(src).toContain('twitter');
    expect(src).toContain('openGraph');
  });

  it.each(routes)('%s keeps its title inside what Google will display', (dir) => {
    // Google renders roughly 60 characters and truncates from the end, so a
    // title over budget loses its tail — here, the brand.
    const src = read(`${dir}/layout.tsx`);
    const match = src.match(/const TITLE = "(.+?)";/);
    expect(match, `${dir} should define a TITLE`).not.toBeNull();
    expect(`${match![1]} | Merritt Workspace`.length, match![1]).toBeLessThanOrEqual(62);
  });
});
