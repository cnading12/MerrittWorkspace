/** @type {import('next').NextConfig} */

// Content-Security-Policy source lists, derived from what the site actually
// loads:
//   • Google Tag Manager / gtag (app/layout.tsx) — script + its collect beacons
//   • Stripe.js (@stripe/stripe-js) — script, plus the js.stripe.com frames
//     that host the payment element and 3-D Secure challenges
//   • Supabase — REST + auth + realtime (wss) from the browser
//   • Google Maps embeds (home, contact, about)
//
// `'unsafe-inline'` is required for scripts because the gtag bootstrap in
// app/layout.tsx is an inline <Script>, and for styles because Next.js and
// Tailwind both inject inline style tags. Removing either needs a nonce-based
// setup, which is a larger change than this audit should make blind.
const SUPABASE_ORIGIN = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  // Nothing on this site should ever be framed by a third party — this is the
  // modern equivalent of X-Frame-Options and blocks clickjacking of the
  // portal and admin screens.
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    SUPABASE_ORIGIN,
    SUPABASE_ORIGIN ? SUPABASE_ORIGIN.replace(/^https:/, 'wss:') : '',
    'https://api.stripe.com',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://region1.google-analytics.com',
  ]
    .filter(Boolean)
    .join(' '),
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.google.com",
  'upgrade-insecure-requests',
].join('; ');

// The CSP ships in Report-Only mode. Everything else below is enforced.
//
// Why: a CSP that is wrong breaks checkout or the portal outright, and the
// exact set of origins Stripe and gtag reach can only be confirmed against
// the real deployed site. Report-Only applies the identical policy and logs
// violations to the browser console without blocking anything, so it can be
// verified for a few days of real traffic first.
//
// To enforce it, change this one constant to 'Content-Security-Policy'.
const CSP_HEADER_NAME = 'Content-Security-Policy-Report-Only';

const securityHeaders = [
  { key: CSP_HEADER_NAME, value: csp },
  // Force HTTPS for two years, including subdomains. Vercel already serves
  // HTTPS only; this stops a downgrade attempt on the first request.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Stop browsers from MIME-sniffing a response into something executable —
  // relevant for the member-document downloads in particular.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Belt-and-braces alongside frame-ancestors, for older browsers.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Don't leak portal/admin URLs (which carry ids) to third-party sites.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // No part of this site needs these devices.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    // 2560/3840 added so full-bleed images on a wide screen at 2x DPR are
    // downscaled rather than stretched — 2048 was the old cap and a 1920px
    // viewport at 2x needs 3840.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  compress: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Every route, including API responses.
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
}

module.exports = nextConfig
