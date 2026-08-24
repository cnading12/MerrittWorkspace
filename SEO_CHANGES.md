# SEO — Merritt Workspace

Two passes so far. The first (2026-06-03) fixed bugs under a strict
"no visual changes" constraint. The second (2026-08-24) rebuilt the structured
data, fixed the titles, and added the day pass page.

---

## Pass 2 — 2026-08-24

### The shape of the problem

The site already had good metadata hygiene: canonicals everywhere, a sitemap, a
robots file, and a `CoworkingSpace` JSON-LD block with full NAP. What it did not
have was a reason for Google to show anything richer than a blue link, or a page
aimed at the highest-intent local searches. This pass targets both.

### 1. Structured data, rebuilt as one linked graph

Was: a single hand-written `CoworkingSpace` blob on every page, with the
business re-described from scratch and nothing else marked up at all.

Now: `lib/seo/schema.ts` builds one `@graph` per page in which every node has a
stable `@id` and references the others. The business is declared once, in the
root layout, and each page adds only what it specifically describes.

| Page | Nodes it now carries |
|---|---|
| every page | `CoworkingSpace`, `WebSite` |
| `/day-pass` | `WebPage`, `BreadcrumbList`, `Service` ($30/day), `FAQPage` |
| `/member-resources/faqs` | `WebPage`, `BreadcrumbList`, `FAQPage` (13 Q&As) |
| `/membership` | `WebPage`, `BreadcrumbList`, `OfferCatalog` (all 7 offers) |
| `/membership/dedicated-desk` | `WebPage`, `BreadcrumbList`, `Service` ($200 + $300) |
| `/membership/private-office` | `WebPage`, `BreadcrumbList`, `Service` ($500/$700/$1200) |
| `/member-resources/meeting-rooms` | `WebPage`, `BreadcrumbList`, `Service` ($25/hr) |
| `/member-resources/flex-space` | `WebPage`, `BreadcrumbList`, `EventVenue` |
| `/contact` | `WebPage`, `BreadcrumbList`, `ContactPage` + `ContactPoint` |

What this buys, concretely: **FAQ rich results** (the FAQ page had 13 good
answers and zero markup), **breadcrumb trails** in place of raw URLs, **price
and offer data** on every product page, and the flex space registered as a
venue in its own right rather than as one of our amenities.

Also added to the business node: a `GeoCircle` service radius, nine named
neighbourhoods, the day pass and private dedicated desk (both previously
missing from the catalog), the conference room as a sellable offer, and a
`logo` as a proper `ImageObject`.

### 2. Titles now fit in the search result

Every child page's title ran past what Google displays, because the template
appended a 27-character suffix. Google truncates at roughly 60 characters and
cuts from the end — so the brand, the thing the suffix existed to add, was the
part being cut.

Shortened the template to `%s | Merritt Workspace` and rewrote all eleven page
titles to land at 55–61 characters with it attached. `/contact` went from 92
characters to 55. A test now fails if any title exceeds the budget.

### 3. A page for the day pass

The $30 day pass has existed since April as one row in a comparison table. It
had no page, so it could not rank. "Day pass Denver" and "drop in coworking
Denver" are the highest-intent local searches available to us — somebody typing
them wants a desk today — and a comparison table loses those every time.

`/day-pass` is a real landing page: who books one, what the $30 includes, how to
get here and park, and four FAQs (rendered on the page *and* marked up, as
Google requires). It links into the application with `?plan=one_day_dedicated_desk`,
and the apply form now pre-selects a plan from that parameter instead of
dropping arrivals into a six-option picker.

### 4. Crawl and indexing

- **Sitemap:** `lastModified` was `new Date()` on every entry, which claimed all
  thirteen pages changed on every deploy. Crawlers discount a sitemap that does
  that. Now real dates. Added `/day-pass`; dropped the two noindexed legal pages
  (listing a noindexed URL is an error in Search Console).
- **robots.txt:** stopped disallowing `/_next/`. It holds the CSS and JS, and a
  renderer that cannot fetch them judges the layout on an unstyled page.
- **noindex** added to `/privacy`, `/terms` and `/admin` (`follow` kept, so
  their links still pass). Deliberately *not* also blocked in robots.txt — a
  blocked crawl means the directive is never read.
- **Titles:** `/terms` was rendering `Terms & Conditions | Merritt Workspace |
  Merritt Workspace Denver`; it was setting the suffix the template also adds.

### 5. Social cards

Only the homepage defined a `twitter` block, so every other page inherited it —
every link shared from anywhere on the site previewed as the homepage. All
eleven marketing routes now set their own.

### 6. Internal linking

The footer is the only place every page links to every other, which makes it
the site's main authority-distribution surface. It reached five pages, leaving
day passes and private offices — the two highest-intent pages — with no
site-wide link. Now two columns covering twelve. Day Pass added to the nav.

### 7. One source of truth

`lib/seo/site.ts` holds the NAP, coordinates, prices and profile URLs that were
previously retyped across five files and had already drifted once (the schema
said $300 for a desk while every page said $200).

`__tests__/seo-schema.test.ts` (55 tests) binds it down: every advertised price
is checked against `lib/portal/pricing.ts` and the conference rate against the
booking page's own constant, so structured data cannot silently disagree with
what we charge.

### 8. Corrected stale facts

Found while writing the FAQ markup, and fixed because Google cross-checks
marked-up answers against the page:

- The FAQ page advertised **"two FREE hours"** of conference room time and
  **$30/hour** overage. The enforced tiers are 4 hrs (dedicated desk) and 14–20
  hrs (private office), billed at **$25**/hour.
- The pet policy referred to a **"Mobile Desk"** plan that no longer exists.

### Verification

- `npm test` — 392 passing, including 55 new SEO tests.
- `npm run build` — compiles, type-checks, 42 static pages.
- Served the production build and asserted against the real HTML: every page's
  title length, canonical, robots directive and JSON-LD graph; no duplicate
  nodes; every marked-up FAQ answer present in the rendered text.

A bug this caught: the `/membership` layout wrapped its nested routes, so
`/membership/dedicated-desk` was emitting two `WebPage` nodes and two
`BreadcrumbList`s that disagreed about which page they described. The index now
sits in a `(overview)` route group, which scopes its schema without changing the
URL.

`npm run lint` still can't run — the repo's flat `eslint.config.mjs` extends
`next/typescript`, which `eslint-config-next@14.0.0` doesn't ship. Pre-existing.

---

## Still worth doing (needs a human)

1. **Google Business Profile is the single biggest remaining lever.** For "near
   me" and map-pack searches the profile outranks the site. Post weekly, keep
   hours and photos current, and ask members for reviews.
2. **Reviews.** `aggregateRating` markup would earn star ratings in results, but
   inventing ratings is a manual action risk — this has to come from real
   reviews on the profile first.
3. **Local citations.** Get the exact NAP in `lib/seo/site.ts` onto Yelp,
   Apple Maps, Bing Places and the Denver chamber directories. Consistency is
   what these are worth; a wrong suite number on one of them costs more than
   the listing gains.
4. **Search Console.** Submit the sitemap, then watch the Breadcrumb, FAQ and
   Merchant listings reports — all three are newly populated and will report
   any node Google rejects.
5. **A dedicated OG image per product page.** They currently share `home-og.jpg`.
6. **Content depth.** A short piece on working from Sloan's Lake — parking, the
   lake loop, coffee nearby — would earn the neighbourhood terms honestly. So
   would a comparison page against the downtown chains.
