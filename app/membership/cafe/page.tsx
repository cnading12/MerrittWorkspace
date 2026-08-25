import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/Footer';
import PageHero from '@/components/marketing/PageHero';
import { BLUR } from '@/components/marketing/blur';
import FaqBlock from '@/components/marketing/FaqBlock';
import { PLANS, SITE_URL } from '@/lib/seo/business';
import { CAFE_MEMBER_LIMIT } from '@/lib/portal/cafeAvailability';

// Prices come from the same table the structured data and /llms.txt quote,
// so the page can never advertise a number the machine-readable surfaces
// disagree with.
const CAFE = PLANS.find(p => p.id === 'cafe_membership')!;
const DESK = PLANS.find(p => p.id === 'dedicated_desk')!;

// The tier that does not need a desk to exist, which is the point: the
// coworking floor is effectively sold out, and this is what we can still sell.
// Server-rendered — the live seat count deliberately is NOT fetched here. A
// number that says "3 places left" ages badly in a static page and reads as a
// pressure tactic; the application form is where the real capacity gate lives.

const INCLUDED = [
  ['Open seating in the café', 'The café side of the 1905 building next door — table seating, natural light, the original stained glass still in the windows. Sit wherever is free.'],
  ['Coffee, tea and beer', 'Free and always on, same as every other membership. The Snackshop covers everything else.'],
  ['Fast fibre WiFi', 'The same connection the desk members use, with a backup line behind it. Built for a day of video calls.'],
  ['Printing', 'Included, and nobody will ask you what it is for.'],
  ['Free parking, right outside', 'The lot in front of the building, or the street on 23rd and Irving. No meters, no garage, no app.'],
  ['2 hours of conference room credit a month', 'The eight-person room with the 75-inch display, for when a call needs a door and a whiteboard.'],
  ['2 hours of flex space credit a week', 'Book the hall itself — the projector, the sound system, the whole room — not just a seat in the cafe.'],
];

export default function CafeMembershipPage() {
  return (
    <main className="bg-bone">
      <PageHero
        src="/images/flex-space/cafe.webp"
        alt="The cafe inside the restored 1905 flex space at Merritt Workspace, where café members work, in Sloan's Lake, Denver"
        blurDataURL={BLUR['flex-space/cafe']}
        eyebrow="New · Café membership"
        title={<>A seat in the cafe, ${CAFE.price} a month.</>}
        lead="Every amenity a desk member has, in the 1905 building next door, for half the price. No assigned desk — and no waiting list for one."
      />

      {/* The honest pitch: this exists because the floor is full. */}
      <section className="mw-section">
        <div className="mw-container">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <p className="mw-eyebrow mb-5">Why it exists</p>
              <h2 className="mw-h2">Our desks are spoken for. The café isn&rsquo;t.</h2>
            </div>
            <div className="md:col-span-7">
              <p className="mw-body">
                The twenty-five desks on the coworking floor are effectively
                sold out, and a desk that isn&rsquo;t there can&rsquo;t be sold
                honestly. The café next door is a different room with a
                different constraint: it has seats, it has the same coffee and
                the same WiFi, and it was already open to members all day.
              </p>
              <p className="mt-5 mw-body">
                So this is that room, sold properly. You get open seating rather
                than a desk with your name on it, half a desk member&rsquo;s
                booking credit, and everything else unchanged &mdash; for
                ${CAFE.price} instead of ${DESK.price}.
                If what you actually want is the desk, say so and we&rsquo;ll
                put you on the list for the next one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What $100 buys, itemised. */}
      <section className="mw-section-alt">
        <div className="mw-container">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <p className="mw-eyebrow mb-5">What&rsquo;s included</p>
              <h2 className="mw-h2">Everything except the desk.</h2>
              <p className="mt-6 mw-body">
                ${CAFE.price} a month, billed monthly. The booking
                credit is exactly half what a dedicated desk gets, which is the
                whole deal: half the price, half the credit, same building, same
                everything else.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/membership/apply?plan=cafe_membership" className="mw-btn-primary">
                  Apply for a café membership
                </Link>
                <a href="tel:+17203579499" className="mw-btn-ghost">
                  (720) 357-9499
                </a>
              </div>
            </div>

            <div className="md:col-span-7">
              <dl>
                {INCLUDED.map(([term, detail]) => (
                  <div key={term} className="border-t border-clay py-6 first:border-t-0 first:pt-0">
                    <dt className="font-display text-[1.35rem] font-semibold tracking-tightest text-ink">
                      {term}
                    </dt>
                    <dd className="mt-2 mw-body">{detail}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </section>

      {/* The cap, stated plainly rather than used as a countdown. */}
      <section className="mw-section">
        <div className="mw-container">
          <div className="grid items-center gap-12 md:grid-cols-12 md:gap-16">
            <div className="relative aspect-[4/3] md:col-span-7 md:aspect-[3/2]">
              <Image
                src="/images/flex-space/rose-window-group.webp"
                alt="Members working together under the rose window in the restored 1905 flex space at Merritt Workspace, Sloan's Lake, Denver"
                fill
                placeholder="blur"
                blurDataURL={BLUR['flex-space/rose-window-group']}
                sizes="(max-width: 768px) 100vw, 58vw"
                className="object-cover object-center"
              />
            </div>
            <div className="md:col-span-5">
              <p className="mw-eyebrow mb-5">The cap</p>
              <h2 className="mw-h2">Fifteen members, and then we stop.</h2>
              <p className="mt-6 mw-body">
                A café membership is only worth having if there is somewhere to
                sit when you arrive, so we cap it at {CAFE_MEMBER_LIMIT} and
                close the tier when it fills. That is not a countdown to rush
                you &mdash; it is the reason the membership works.
              </p>
              <p className="mt-5 mw-body">
                If all {CAFE_MEMBER_LIMIT} places are taken when you apply,
                the form will say so plainly. Get in touch and we&rsquo;ll tell
                you the moment one opens up.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/membership/apply?plan=cafe_membership" className="mw-btn-primary">
                  Apply now
                </Link>
                <Link href="/membership" className="mw-btn-ghost">
                  Compare memberships
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FaqBlock
        ids={["cafe-what", "cafe-included", "cafe-vs-desk", "cafe-limit"]}
        id={`${SITE_URL}/membership/cafe#faq`}
        eyebrow="Before you apply"
        heading="Café membership questions."
        tone="alt"
      />

      <Footer />
    </main>
  );
}
