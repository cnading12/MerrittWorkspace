/** @type {import('next').NextConfig} */
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
}

module.exports = nextConfig