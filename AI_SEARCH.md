# Being the answer when someone asks an AI for a workspace

Date: 2026-08-24

Traditional SEO optimises for a page of blue links. This work optimises for the
other thing people now do: type "best coworking space in Denver" into Claude,
ChatGPT, Perplexity or Google's AI overview and act on the paragraph that comes
back.

Those systems reach us three ways, and each needed something different.

1. **A crawler fetches the site while the user waits.** ChatGPT-User,
   Claude-User, PerplexityBot and OAI-SearchBot pull live pages mid-answer.
   They need to be allowed in, and they need the answer to be *in the HTML* —
   they do not click accordions or wait for `useEffect`.
2. **A model was trained or grounded on a crawl of the site.** GPTBot,
   ClaudeBot, Google-Extended, Applebot-Extended, CCBot. Same requirement,
   longer time horizon.
3. **A model repeats what other sources say about us.** Google Business Profile,
   reviews, directories, local press. That part is not code — see the checklist
   at the bottom.

The recurring theme in what follows: **one fact, stated identically everywhere.**
An assistant that finds "$25/hour" in the JSON-LD, "$30/hour" on the FAQ page and
nothing in between hedges, or picks a competitor whose numbers agree with
themselves.

---

## What changed

### One source of truth for every fact

`lib/seo/business.ts` and `lib/seo/faqs.ts` now hold the address, phone, every
plan and price, the amenities, the policies and every question-and-answer on
the site. Hours are not restated here — they are read from `lib/hours.ts`, which
already serves the portal, the booking routes and transactional email. The JSON-LD, `/llms.txt`, the FAQ page and
the new homepage facts block all read from them.

Change a price in one place and the visible page, the structured data and the
plain-text file for AI crawlers all move together. `__tests__/seo-facts.test.ts`
fails the build if an FAQ answer ever quotes a price that no plan has.

This also fixed a live contradiction: the FAQ page said the conference room was
"$30/hour with two free hours a month", while the booking page and the billing
code both use **$25/hour** with 4 / 14 / 20 included hours by tier. The FAQ was
wrong and is now generated from the same numbers the booking flow uses.

### The FAQ answers now exist in the HTML

This was the single biggest gap. The FAQ accordion only mounted the answer that
was open — every other answer was absent from the document, not merely hidden.
A crawler fetching `/member-resources/faqs` saw one answer out of twenty-five.

Answers are now always rendered and collapsed with the `hidden` attribute.
Identical on screen; the full text of all twenty-five is now in the markup.

Ten new questions were added, written the way someone phrases them to an
assistant rather than the way a member phrases them to staff: what is this
place, how much does it cost, do you offer day passes, can I try it first,
how long is the commitment, can non-members rent the room, can I use it as my
business address, do you have team offices, where are you, how is this
different from a chain.

Each answer is written to survive being quoted with no page around it — the
address, the prices and the phone number are spelled out inside the answer
rather than left to context.

### `/llms.txt` and `/llms-full.txt`

A convention (llmstxt.org) for handing a model the facts in plain markdown
instead of making it infer them from HTML full of navigation and image markup.

- `/llms.txt` — identity, the full price list, and an annotated map of the site.
- `/llms-full.txt` — every price, amenity, policy and FAQ answer in one fetch,
  so an assistant can answer completely without crawling ten pages.

Both are generated from the facts module, so they cannot go stale.

### robots.txt names the AI crawlers

Previously a permissive wildcard covered them by accident. Now twenty-five AI
crawlers are named and allowed explicitly, so a future edit to the wildcard rule
cannot lock them out silently. `/admin/` is now disallowed and carries `noindex`;
`/portal/` stays crawlable *on purpose*, because blocking it would stop a crawler
from ever reading the `noindex` it already carries.

### Structured data

- Business, `WebSite` and `Place` nodes in one `@graph`, with the two clocks
  labelled separately in words — 24/7 member access, and business hours when
  the door is simply unlocked — instead of collapsed into one ambiguous range.
  Both read their times from `lib/hours.ts`, the same module the portal, the
  booking routes and the transactional email use, so the hours an assistant
  reports cannot drift from the hours a member is held to.
- Every membership as a `Product` with a priced `Offer` at its own URL.
- The conference room as a bookable `Service` — the one thing here a
  non-member can buy, and the answer to "meeting room rental Denver".
- `FAQPage` markup on the FAQ page and the contact page, each paired with a
  **visible** block of the same questions and answers. The two ship as one
  component (`components/marketing/FaqBlock.tsx`) on purpose: FAQ structured
  data is only legitimate when the page really shows what it claims, and
  binding them together makes it impossible to end up with markup describing
  content a visitor cannot see.

  The markup used to ride along on the homepage and on every membership and
  member-resource page too. Those blocks came off: their questions restated
  the sections directly above them — the price, the commitment, the trial day —
  so anyone who read the page read it twice, and the conference room page ended
  by telling the reader to visit the conference room page. Those pages now
  close with `components/marketing/MoreQuestions.tsx`, a single line linking
  into `/member-resources/faqs`, which renders every entry in
  `lib/seo/faqs.ts` and carries the `FAQPage` markup for the whole set. Nothing
  was lost from the answer set — only the second copy of it.

  If you are tempted to put a FAQ block back on a product page, the test is
  whether it answers something the page above it does not.
- `BreadcrumbList` on every marketing page.
- Neighbourhoods we actually serve (Highlands, West Colfax, Berkeley,
  Edgewater, Lakewood) added to `areaServed`.

No ratings or review counts were invented. Those have to come from real reviews.

### A facts block on the homepage

A twelve-item definition list — address, access, parking, prices, commitment,
free trial, phone. It answers the questions people ring up about, and it is the
densest patch of extractable fact on the site: short labelled values survive
summarisation where the same facts spread through prose and photographs do not.

### Guessable URLs

`/pricing`, `/faq`, `/private-office`, `/meeting-rooms`, `/apply` and twenty
others now 308 to the real page. Assistants routinely invent the obvious URL
when citing a site; these turn a 404 in front of a prospect into the right page.
They are redirects, not duplicate pages — each destination stays canonical.

---

## What has to happen off the site

Code can make us quotable. It cannot make us *cited* — that comes from what
other sources say about us, and every item below is worth more than anything
above it.

1. **Google Business Profile.** The highest-leverage item, full stop. Claim and
   complete it at google.com/business: hours (all three), the `$200–$1,200`
   price range, photos, the full amenity list, and the Q&A section — seed it
   with the same questions now on the FAQ page. AI overviews and assistants lean
   on it heavily for local business questions.
2. **Reviews, and enough of them.** Assistants reach for consensus, and
   consensus needs volume. Ask every happy member for a Google review; twenty
   detailed reviews mentioning "Sloan's Lake", "free parking" and "private
   office" is worth more than any markup on this site. Reply to all of them.
3. **Coworking directories.** Free or cheap listings that assistants and their
   crawlers read constantly: Coworker.com, LiquidSpace, Deskpass, Upsuite,
   Workfrom, Yelp, Bing Places, Apple Business Connect, Nextdoor Business. Use
   the exact name, address and phone from `lib/seo/business.ts` — byte-identical
   across every listing.
4. **Get named in "best coworking in Denver" articles.** These lists are the
   substrate assistants summarise. Denver Business Journal, Westword, 5280,
   Denverite, BusinessDen; the neighbourhood press (Sloan's Lake / Highlands);
   Built In Colorado for the startup audience. A short pitch built on the
   genuine differentiators — the 1905 hall, free parking, no amenity fees,
   independent ownership — is a real story.
5. **Reddit and community forums.** r/Denver and r/DenverCoworking threads get
   quoted verbatim by assistants. Do not astroturf; it backfires and it is
   dishonest. Do encourage real members to answer when someone asks.
6. **Add the social profiles we are missing.** The `sameAs` list currently has
   Instagram, Facebook, Google Maps and merrittwellness.net. LinkedIn and a
   completed Google Business Profile URL should be added to
   `BUSINESS.socialProfiles` once they exist.
7. **Ask the assistants yourself, monthly.** Put "coworking space in Sloan's
   Lake", "private office rental Denver", "meeting room rental near Sloan's
   Lake" and "best coworking in Denver with free parking" to Claude, ChatGPT and
   Perplexity. Note whether we appear, and what they say we cost. Wrong prices
   in an answer point at a stale third-party listing — usually one of the
   directories in item 3.

## Two smaller things worth doing

- **A JPEG Open Graph image per page.** Only the homepage has one
  (`/public/images/og/home-og.jpg`). Other pages point at `.webp`, which some
  scrapers and email clients will not render. 1200×630 JPEGs would fix it.
- **Real photos of the flex hall in the directory listings.** The 1905 building
  is the thing no other Denver coworking space has, and it is what makes an
  assistant single us out rather than list us third.
