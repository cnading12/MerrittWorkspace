import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { PLANS, PRICE_RANGE } from '@/lib/seo/business';
import { FAQS } from '@/lib/seo/faqs';

/**
 * Page-level metadata invariants.
 *
 * `seo-facts.test.ts` guards the *content* of the machine-readable surfaces —
 * robots.txt, llms.txt, and whether a quoted price matches the plan table.
 * This file guards the per-page `<head>`: titles that survive truncation,
 * social cards that do not all claim to be the homepage, and the crawl
 * directives staying consistent with each other.
 */

const root = join(__dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

/** Every marketing route that ships its own metadata block. */
const ROUTES = [
  'app/about',
  'app/contact',
  'app/member-resources/faqs',
  'app/member-resources/flex-space',
  'app/member-resources/meeting-rooms',
  'app/member-resources/snackshop',
  'app/membership/(overview)',
  'app/membership/apply',
  'app/membership/cafe',
  'app/membership/dedicated-desk',
  'app/membership/private-office',
];

const BRAND_SUFFIX = ' | Merritt Workspace';

describe('page titles fit in a search result', () => {
  it('uses a short brand suffix, since the tail is what gets truncated', () => {
    // Google renders roughly 60 characters and cuts from the end, so a long
    // suffix costs the brand it exists to add.
    expect(read('app/layout.tsx')).toContain('template: "%s | Merritt Workspace"');
  });

  it.each(ROUTES)('%s stays inside the budget with the suffix attached', (dir) => {
    const src = read(`${dir}/layout.tsx`);
    // Some routes inline the title, others hoist it to a TITLE constant so the
    // OG block can reuse it. Accept either.
    const match =
      src.match(/^  title: "(.+?)",$/m) ?? src.match(/^const TITLE = "(.+?)";$/m);
    expect(match, `${dir} should declare a title`).not.toBeNull();
    const full = match![1] + BRAND_SUFFIX;
    expect(full.length, full).toBeLessThanOrEqual(62);
  });
});

describe('social cards', () => {
  it.each(ROUTES)('%s sets its own', (dir) => {
    // Without an explicit `twitter` block a route inherits the homepage's, so
    // every link shared from anywhere previews as the homepage regardless of
    // what was actually shared.
    const src = read(`${dir}/layout.tsx`);
    expect(src).toContain('twitter:');
    expect(src).toContain('openGraph:');
  });

  it.each(ROUTES)('%s declares its own canonical', (dir) => {
    expect(read(`${dir}/layout.tsx`)).toContain('canonical');
  });
});

describe('crawl directives agree with each other', () => {
  it('does not sitemap a page it tells crawlers not to index', () => {
    // Asking for a crawl and then refusing the index is a contradiction
    // Search Console reports as an error.
    const sitemap = read('app/sitemap.ts');
    for (const noindexed of ['/privacy', '/terms']) {
      expect(sitemap, noindexed).not.toContain(`path: '${noindexed}'`);
    }
    expect(read('app/privacy/layout.tsx')).toContain('index: false');
    expect(read('app/terms/page.tsx')).toContain('index: false');
  });

  it('gives each sitemap entry a real date rather than the build time', () => {
    // `new Date()` on every entry claims the whole site changed on every
    // deploy; crawlers learn to discount a sitemap that does that.
    const sitemap = read('app/sitemap.ts');
    expect(sitemap).not.toMatch(/lastModified:\s*currentDate/);
    expect(sitemap).toMatch(/lastModified: '\d{4}-\d{2}-\d{2}'/);
  });

  it('sitemaps every marketing route that has a layout', () => {
    const sitemap = read('app/sitemap.ts');
    const paths = ROUTES.map((dir) =>
      dir.replace(/^app/, '').replace('/(overview)', ''),
    );
    for (const path of paths) {
      expect(sitemap, path).toContain(`path: '${path}'`);
    }
  });
});

describe('breadcrumbs are not emitted twice', () => {
  // A layout at a segment root wraps its nested routes too. /membership has
  // children that render their own BreadcrumbSchema, so the index's schema
  // lives in a (overview) route group — otherwise those pages carry two
  // BreadcrumbLists that disagree about which page they describe.
  it('keeps the membership index schema out of its children', () => {
    const segmentRoot = join(root, 'app/membership/layout.tsx');
    expect(() => readFileSync(segmentRoot, 'utf8')).toThrow();
    expect(read('app/membership/(overview)/layout.tsx')).toContain('BreadcrumbSchema');
  });

  it('has no other segment-root layout wrapping schema-bearing children', () => {
    // Guards the same trap elsewhere: a layout that renders BreadcrumbSchema
    // while sibling subdirectories have layouts of their own.
    const offenders: string[] = [];
    const walk = (rel: string) => {
      const abs = join(root, rel);
      for (const entry of readdirSync(abs, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
        const childRel = join(rel, entry.name);
        const layout = join(root, childRel, 'layout.tsx');
        let src = '';
        try { src = readFileSync(layout, 'utf8'); } catch { /* no layout here */ }
        if (src.includes('BreadcrumbSchema')) {
          const nested = readdirSync(join(root, childRel), { withFileTypes: true })
            .filter((d) => d.isDirectory() && !d.name.startsWith('('))
            .filter((d) => {
              try { readFileSync(join(root, childRel, d.name, 'layout.tsx'), 'utf8'); return true; }
              catch { return false; }
            });
          if (nested.length > 0) offenders.push(childRel);
        }
        walk(childRel);
      }
    };
    walk('app');
    expect(offenders).toEqual([]);
  });
});

describe('the café tier is quoted consistently', () => {
  const cafe = PLANS.find((p) => p.id === 'cafe_membership');

  it('is in the plan table the structured data and llms.txt read', () => {
    expect(cafe).toBeDefined();
    expect(cafe!.price).toBe(100);
    expect(cafe!.meetingCreditPerMonth).toBe(2);
    expect(cafe!.flexCreditPerWeek).toBe(2);
  });

  it('sets the bottom of the advertised price range', () => {
    const cheapest = Math.min(...PLANS.map((p) => p.price));
    expect(PRICE_RANGE).toBe(`$${cheapest} - $1200/month`);
  });

  it('has FAQs on the shared list, so they reach every surface', () => {
    // A private array on the page would keep them out of /llms-full.txt and
    // the FAQ page, which is where an assistant actually looks.
    const ids = FAQS.map((f) => f.id);
    for (const id of ['cafe-what', 'cafe-included', 'cafe-vs-desk', 'cafe-limit']) {
      expect(ids, id).toContain(id);
    }
  });

  it('renders those FAQs on its page through the block that ships the markup', () => {
    const page = read('app/membership/cafe/page.tsx');
    expect(page).toContain('FaqBlock');
    expect(page).toContain('cafe-what');
  });
});

describe('the retired day pass', () => {
  // No longer sold. The designation, the day_passes table and the portal's
  // repeat-purchase route all survive so existing holders keep working — but
  // nothing a prospective member or a crawler reaches may offer one.
  const customerFacing = [
    'app/layout.tsx',
    'app/membership/(overview)/layout.tsx',
    'app/membership/(overview)/page.tsx',
    'app/membership/apply/page.tsx',
    'app/membership/apply/FullApplicationForm.tsx',
    'app/membership/cafe/layout.tsx',
    'app/membership/dedicated-desk/layout.tsx',
    'app/sitemap.ts',
    'components/Navbar.tsx',
    'components/Footer.tsx',
    'lib/seo/business.ts',
    'lib/seo/faqs.ts',
  ];

  it.each(customerFacing)('%s does not offer one', (path) => {
    const src = read(path);
    expect(src).not.toContain('one_day_dedicated_desk');

    // Checking the plan id alone is not enough: the id was gone from these
    // files while the copy still advertised "$30 day passes", which is what a
    // prospect and a crawler actually read. Comments are stripped first —
    // this is about what we advertise, not about a code comment explaining
    // why a retired `unit: 'day'` is still in the type. The one sentence that
    // legitimately says the words is the FAQ telling people we stopped.
    const prose = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/We no longer sell day passes\./g, '');
    expect(prose).not.toMatch(/day pass/i);
  });

  it('is absent from the plan table', () => {
    expect(PLANS.map((p) => p.id)).not.toContain('one_day_dedicated_desk');
    expect(PLANS.every((p) => p.unit === 'month')).toBe(true);
  });

  it('keeps the designation, so existing holders stay valid', () => {
    // Deleting it would orphan live members rows and the day_passes table.
    expect(read('lib/portal/types.ts')).toContain('one_day_dedicated_desk');
    expect(read('lib/portal/pricing.ts')).toContain('one_day_dedicated_desk');
  });
});
