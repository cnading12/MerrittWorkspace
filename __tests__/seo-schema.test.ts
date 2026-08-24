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
import { CAFE_FAQS, FAQS } from '@/lib/seo/faqs';
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
    ['cafeMembership', 'cafe_membership'],
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
    expect(names).toContain('Café Membership');
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
      path: '/membership/cafe',
      name: 'Café Membership',
      description: 'x',
      offerNames: ['Café Membership'],
    });
    expect(node.offers.price).toBe(String(PRICES.cafeMembership));
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
    for (const { question, answer } of [...FAQS, ...CAFE_FAQS]) {
      expect(question.length, question).toBeGreaterThan(10);
      expect(answer.length, question).toBeGreaterThan(40);
      // Markup in an answer is a rich-result violation, not just untidy.
      expect(answer, question).not.toMatch(/<[a-z/]/i);
    }
  });

  it('renders the café FAQs it marks up, as Google requires', () => {
    const page = read('app/membership/cafe/page.tsx');
    expect(page).toContain('CAFE_FAQS');
    const node = faqPageNode('/membership/cafe', CAFE_FAQS);
    expect(node.mainEntity).toHaveLength(CAFE_FAQS.length);
    expect(node.mainEntity[0]['@type']).toBe('Question');
    expect(node.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
  });
});

describe('the emitted graph', () => {
  it('serializes, and every node is typed and addressable', () => {
    const data = graph([
      organizationNode(),
      webSiteNode(),
      webPageNode({ path: '/membership/cafe', name: 'Café Membership', description: 'x' }),
      breadcrumbNode([{ name: 'Café Membership', path: '/membership/cafe' }]),
      faqPageNode('/membership/cafe', CAFE_FAQS),
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

describe('the retired day pass', () => {
  // Day passes are no longer sold. The designation, the day_passes table and
  // the portal's repeat-purchase route all survive so existing holders keep
  // working — but nothing a prospective member can reach may offer one.
  const customerFacing = [
    'app/membership/(overview)/page.tsx',
    'app/membership/apply/page.tsx',
    'app/sitemap.ts',
    'components/Navbar.tsx',
    'components/Footer.tsx',
    'lib/seo/schema.ts',
    'lib/seo/site.ts',
  ];

  it.each(customerFacing)('%s no longer offers it', (path) => {
    expect(read(path)).not.toContain('one_day_dedicated_desk');
  });

  // Checking the plan id alone is not enough: the id was gone from these files
  // while the marketing copy in them still advertised "$30 day passes", which
  // is what a prospect and a crawler actually read.
  const marketingCopy = [
    'app/layout.tsx',
    'app/membership/(overview)/layout.tsx',
    'app/membership/(overview)/page.tsx',
    'app/membership/cafe/layout.tsx',
    'app/member-resources/faqs/page.tsx',
    'components/Navbar.tsx',
    'components/Footer.tsx',
    'lib/seo/faqs.ts',
    'lib/seo/schema.ts',
  ];

  it.each(marketingCopy)('%s does not still advertise one in prose', (path) => {
    expect(read(path)).not.toMatch(/day pass/i);
  });

  it('is absent from the offer catalog', () => {
    const names = OFFERS.map((o) => o.name).join(' ');
    expect(names).not.toMatch(/day pass/i);
  });

  it('keeps the designation so existing holders stay valid', () => {
    // Deleting it would orphan live members rows and the day_passes table.
    expect(read('lib/portal/types.ts')).toContain('one_day_dedicated_desk');
    expect(read('lib/portal/pricing.ts')).toContain('one_day_dedicated_desk');
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
      '/membership/cafe',
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
    'app/membership/cafe',
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
