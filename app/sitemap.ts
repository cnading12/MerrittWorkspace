import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/site';

/**
 * `lastModified` used to be `new Date()` on every entry, which told Google that
 * all thirteen pages changed every time the site was deployed. Crawlers learn
 * to distrust a sitemap that cries wolf, and then ignore the dates that are
 * true. These are the real dates the pages last changed in substance; bump the
 * one you edited when you edit it, and leave the rest alone.
 *
 * Legal pages (/privacy, /terms) are absent on purpose — they carry
 * `robots: noindex`, and listing a noindexed URL as something we want crawled
 * is a contradiction Search Console reports as an error.
 */
const pages: { path: string; lastModified: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }[] = [
  { path: '/', lastModified: '2026-08-24', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/membership', lastModified: '2026-08-24', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/membership/dedicated-desk', lastModified: '2026-08-24', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/membership/private-office', lastModified: '2026-08-24', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/membership/cafe', lastModified: '2026-08-24', changeFrequency: 'monthly', priority: 0.9 },
  { path: '/member-resources/meeting-rooms', lastModified: '2026-08-24', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/membership/apply', lastModified: '2026-08-24', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/contact', lastModified: '2026-08-24', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/member-resources/flex-space', lastModified: '2026-08-24', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/about', lastModified: '2026-08-24', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/member-resources/faqs', lastModified: '2026-08-24', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/member-resources/snackshop', lastModified: '2026-08-24', changeFrequency: 'monthly', priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return pages.map((p) => ({
    url: p.path === '/' ? SITE_URL : `${SITE_URL}${p.path}`,
    lastModified: new Date(`${p.lastModified}T00:00:00Z`),
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
