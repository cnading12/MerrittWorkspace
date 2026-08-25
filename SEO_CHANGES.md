# SEO — Merritt Workspace

Three passes. The first (2026-06-03) fixed broken share images and duplicate
titles under a strict "no visual changes" constraint. The second built a
structured-data layer on this branch. The third — `Make the site answerable by
AI assistants and answer engines`, merged to `main` as PR #173 — built a
**better** one, and is now the base.

## Where the structured data lives

`lib/seo/business.ts` is the single source of truth: address, hours, prices,
plans, policies. Everything machine-readable reads from it —

- `components/LocalBusinessSchema.tsx` — the `CoworkingSpace` node
- `components/seo/MembershipSchema.tsx` — each plan as a `Product` + `Offer`
- `components/seo/BreadcrumbSchema.tsx`, `FaqSchema.tsx`, `MeetingRoomSchema.tsx`
- `app/llms.txt` and `app/llms-full.txt` — for AI answer engines
- `lib/seo/faqs.ts` → `components/marketing/FaqBlock.tsx`, which ships the
  visible questions and their `FAQPage` markup together so a page can never
  have one without the other

This branch originally carried a parallel implementation (`lib/seo/site.ts`,
`lib/seo/schema.ts`, `components/seo/PageSchema.tsx`). Those are **deleted**.
Main's covers the same ground and more, and two schema layers on one page is
worse than either alone.

## What this branch still adds on top

### Page metadata

Main's pass focused on the machine-readable surfaces and left the per-page
`<head>` largely as it was. Fixed here:

- **Titles were being truncated.** The template appended 27 characters, and
  Google cuts from the end at roughly 60 — so the brand the suffix existed to
  add was the part being cut. Template shortened to `%s | Merritt Workspace`
  and all eleven titles rewritten to fit. `/contact` went from 92 to 55.
- **Only the homepage set a `twitter` block**, so every link shared from
  anywhere on the site previewed as the homepage. All eleven marketing routes
  now set their own.
- **`/privacy` and `/terms` are `noindex, follow`** and dropped from the
  sitemap — listing a noindexed URL is an error in Search Console.
- **The sitemap gave every entry `new Date()`**, claiming the whole site
  changed on every deploy. Real dates now.

### A duplicate-breadcrumb bug

`app/membership/layout.tsx` rendered `MembershipSchema` and `BreadcrumbSchema`
at the segment root, so they also landed on `/membership/dedicated-desk` and
`/membership/private-office` — which render their own. Those pages carried two
`BreadcrumbList`s disagreeing about which page they described.

The index now sits in a `(overview)` route group, which scopes its schema
without changing the URL. `__tests__/seo-metadata.test.ts` walks `app/` and
fails if any other segment-root layout falls into the same trap.

### The café membership, and the retired day pass

See `CLAUDE.md`. In SEO terms: `cafe_membership` is in `PLANS`, so it flows
into the JSON-LD, `/llms.txt` and the FAQ list automatically;
`/membership/cafe` is a landing page with its own `Product` schema and four
FAQs; `one_day_dedicated_desk` is gone from every customer-facing surface.

## Verification

- `npm test` — 474 passing.
- `npm run build` — compiles, type-checks, 42 static pages.
- Served the production build and asserted against real HTML: title lengths,
  canonicals, robots directives, one `BreadcrumbList` per page, unique
  `Product` `@id`s, and no day-pass copy anywhere except the FAQ sentence that
  says we stopped selling them.

`npm run lint` still can't run — the repo's flat `eslint.config.mjs` extends
`next/typescript`, which `eslint-config-next@14.0.0` doesn't ship. Pre-existing.

## Still worth doing (needs a human)

1. **Google Business Profile is the biggest remaining lever.** For "near me"
   and map-pack searches the profile outranks the site. Post weekly, keep hours
   and photos current, ask members for reviews.
2. **Reviews**, then `aggregateRating`. Inventing ratings is a manual-action
   risk, so this has to come from real reviews on the profile first.
3. **Local citations** — get the exact NAP from `lib/seo/business.ts` onto
   Yelp, Apple Maps, Bing Places and the Denver chamber directories.
4. **Search Console** — submit the sitemap, then watch the Breadcrumb, FAQ and
   Merchant listings reports.
5. **A dedicated OG image per product page.** Several still share `home-og.jpg`.
