import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  // Note what is deliberately *not* here: /portal, /admin, /privacy and /terms.
  // Those are kept out of search with a `noindex` in their own metadata, which
  // only works if the crawler is allowed to fetch the page and read it. Block
  // them here instead and Google never sees the directive, so a URL it finds
  // from any inbound link can still show up as a bare, description-less result.
  const disallow = [
    '/api/',
    '/booking-success/',
    '/order-confirmation/',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        // /_next/ is intentionally crawlable. It holds the CSS and JS, and a
        // renderer that cannot fetch those sees an unstyled page and judges the
        // layout — and mobile-friendliness — on that.
        allow: '/',
        disallow,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
