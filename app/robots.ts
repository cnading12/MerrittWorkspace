import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/booking-success/',
          '/order-confirmation/',
          '/_next/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/booking-success/',
          '/order-confirmation/',
        ],
      },
    ],
    sitemap: 'https://merrittworkspace.net/sitemap.xml',
    host: 'https://merrittworkspace.net',
  };
}
