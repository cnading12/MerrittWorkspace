/** @type {import('next').NextConfig} */

/**
 * Short, guessable URLs for the pages people (and language models) most often
 * try to reach directly.
 *
 * An assistant recommending this space frequently invents the obvious URL —
 * /pricing, /faq, /private-office — rather than the real nested path. A 308
 * here turns what would be a 404 in front of a prospect into the right page,
 * and consolidates any links pointed at the guessed address onto the canonical
 * one. These are redirects, never duplicate pages: each destination stays the
 * single canonical URL for its content.
 */
const SHORTCUTS = [
  ['/pricing', '/membership'],
  ['/prices', '/membership'],
  ['/plans', '/membership'],
  ['/coworking', '/membership'],
  ['/memberships', '/membership'],
  ['/dedicated-desk', '/membership/dedicated-desk'],
  ['/dedicated-desks', '/membership/dedicated-desk'],
  ['/desks', '/membership/dedicated-desk'],
  ['/private-office', '/membership/private-office'],
  ['/private-offices', '/membership/private-office'],
  ['/offices', '/membership/private-office'],
  ['/office-space', '/membership/private-office'],
  ['/apply', '/membership/apply'],
  ['/join', '/membership/apply'],
  ['/trial', '/membership/apply?trial=1'],
  ['/day-pass', '/membership/apply'],
  ['/tour', '/contact'],
  ['/contact-us', '/contact'],
  ['/faq', '/member-resources/faqs'],
  ['/faqs', '/member-resources/faqs'],
  ['/meeting-room', '/member-resources/meeting-rooms'],
  ['/meeting-rooms', '/member-resources/meeting-rooms'],
  ['/conference-room', '/member-resources/meeting-rooms'],
  ['/conference-rooms', '/member-resources/meeting-rooms'],
  ['/event-space', '/member-resources/flex-space'],
  ['/flex-space', '/member-resources/flex-space'],
  ['/snackshop', '/member-resources/snackshop'],
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
  async redirects() {
    return SHORTCUTS.map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },
}

module.exports = nextConfig
