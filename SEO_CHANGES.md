# SEO Changes — Merritt Workspace

Date: 2026-06-03
Constraint honored: **no visual changes.** Every edit is in `<head>`/metadata,
non-rendered config, or a tag/attribute swap with **identical Tailwind classes**.
No `className` value was modified anywhere (verified via diff).

## Summary of what changed

### P0 — Fixed active bugs

1. **Broken social-share images (site-wide).** Every Open Graph / Twitter image
   and three JSON-LD images pointed to `.jpg`/`.png` files that don't exist —
   only `.webp` versions are in `/public`. Link previews were blank everywhere.
   Repointed to the existing `.webp` files in:
   - `app/layout.tsx` (OG + Twitter)
   - `app/about/layout.tsx`, `app/contact/layout.tsx`,
     `app/membership/layout.tsx`, `app/membership/dedicated-desk/layout.tsx`,
     `app/membership/private-office/layout.tsx`
   - `components/LocalBusinessSchema.tsx` (3 images in the `image` array)

2. **Price consistency.** Meta/titles said dedicated desks "from $200/mo" but the
   JSON-LD schema said `$300` and `priceRange "$300 - $1200/month"`. Per your
   confirmation that **$200 is correct**, updated `LocalBusinessSchema.tsx`:
   dedicated-desk offer `price`/`priceSpecification` → `200`, and `priceRange` →
   `$200 - $1200/month`.

### P1 — Unique metadata for previously-default pages

These routed pages were `"use client"` with no `layout.tsx`, so they inherited the
homepage title/description (duplicate-title risk). Added server-component
`layout.tsx` wrappers (each just `return children` — zero DOM impact) with unique
title, description, canonical, and Open Graph tags:
   - `app/member-resources/meeting-rooms/layout.tsx` (targets "meeting room
     rental Denver" / "conference room rental Denver")
   - `app/member-resources/faqs/layout.tsx`
   - `app/member-resources/snackshop/layout.tsx`
   - `app/membership/apply/layout.tsx`
   - `app/privacy/layout.tsx`

### P1 — Broken internal links

`components/Footer.tsx` linked to `/meeting-rooms` and `/snackshop`, which 404.
Corrected to `/member-resources/meeting-rooms` and `/member-resources/snackshop`
(href only; link text and classes unchanged).

### P2 — Crawl coverage & indexing

- Added `/member-resources/snackshop` to `app/sitemap.ts`.
- Added `robots: { index: false, follow: false }` to `app/portal/layout.tsx` so
  member-portal/auth screens stay out of search results. (Intentionally **not**
  also disallowed in robots.txt — blocking the crawl would stop Google from ever
  seeing the `noindex`.) Per your decision, `/membership/apply` remains indexable.

### P2 — Heading hierarchy

`app/page.tsx`: the hero-carousel caption jumped `h1 → h3`. Promoted to `h2`
(identical classes → identical rendering) so the outline no longer skips a level.

## Verification

- `npm run build` compiles successfully; type-checking and lint pass. All new
  routes plus `/robots.txt` and `/sitemap.xml` build. (Note: the build needs the
  project's normal Stripe/Supabase/etc. env vars to finish "Collecting page
  data" for the `/api/*` routes — this is pre-existing and unrelated to SEO; it
  succeeds once env vars are present, as on Vercel.)
- Diff confirms no `className` value changed. Only DOM mutations: one `h3`→`h2`
  tag swap (same classes) and two footer `href` values. Appearance is unchanged.

## Already in good shape (left as-is)

- App Router metadata API with `metadataBase`, title template, robots, geo meta.
- Per-route canonicals; `robots.ts` + `sitemap.ts`; rich `CoworkingSpace` JSON-LD
  with NAP, geo, hours, amenities, and offer catalog (correctly the most specific
  business type).
- `<html lang="en">`, one `<h1>` per page, `next/image` with `fill` + `sizes` +
  `priority` on the hero (good CLS), AVIF/WebP in `next.config.js`.
- Fonts are **system Helvetica/Arial** (no web font fetched), so `next/font` is
  unnecessary — adding it would risk changing glyph rendering, so it was avoided.

## Follow-ups needing a human / visual decision

1. **OG image format.** WebP previews work in most scrapers but a few older ones
   (and some email clients) prefer JPEG/PNG at 1200×630. If you want maximum
   compatibility, export dedicated `.jpg`/`.png` OG images and we'll point to
   those instead.
2. **Confirm prices end-to-end.** We aligned the schema to $200 for dedicated
   desks. Please confirm the full current price list (single office $500, 2-desk
   $700, large team $1200) still matches reality so the structured data stays
   accurate.
3. **Phone number.** The business brief listed phone as "[FILL IN]"; the code
   already uses `+1 (720) 357-9499` consistently. Confirm that's correct.
4. **`sameAs` social profiles.** The schema only links `merrittwellness.net`. Add
   real Google Business Profile, Instagram, LinkedIn, Facebook URLs to strengthen
   entity signals (content addition — needs the actual URLs).
5. **Content depth.** The FAQ and meeting-room pages are good candidates for
   `FAQPage` / `Service` structured data and richer copy targeting "meeting room
   rental Denver" — a content decision rather than a code-only change.
