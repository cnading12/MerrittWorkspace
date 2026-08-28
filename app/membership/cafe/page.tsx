import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/Footer';
import PageHero from '@/components/marketing/PageHero';
import { BLUR } from '@/components/marketing/blur';
import DeskCountLine from '@/components/marketing/DeskCountLine';
import MoreQuestions from '@/components/marketing/MoreQuestions';
import { PLANS } from '@/lib/seo/business';
import { CAFE_MEMBER_LIMIT } from '@/lib/portal/cafeAvailability';

// Prices come from the same table the structured data and /llms.txt quote,
// so the page can never advertise a number the machine-readable surfaces
// disagree with.
const CAFE = PLANS.find(p => p.id === 'cafe_membership')!;
const DESK = PLANS.find(p => p.id === 'dedicated_desk')!;

// The café tier, described on its own terms.
//
// This page used to open by explaining that the coworking floor was sold out,
// which made a café membership read as the consolation prize — and hard-coded
// a claim about desk availability that went stale the first time a desk opened
// up. The pitch now says what the room is for, and <DeskCountLine> reads the
// live desk count from /api/desk-availability so the one factual claim about
// desks is fetched rather than written down.
//
// The café's OWN cap (15 places) is still stated in words rather than
// counted down: the application form is where that gate really lives, and a
// live "3 places left" on a marketing page reads as a pressure tactic.

const INCLUDED = [
  ['Open seating in the café', 'The café side of the 1905 building next door — table seating, natural light, the original stained glass still in the windows. Sit wherever is free.'],
  ['Coffee, tea and beer', 'Free and always on, same as every other membership. The Snackshop covers everything else.'],
  ['Fast fibre WiFi', 'The same connection the desk members use, with a backup line behind it. Built for a day of video calls.'],
  ['Printing', 'Included, and nobody will ask you what it is for.'],
  ['Lockable storage', 'A locker of your own, so the laptop charger and the good headphones do not commute with you every day.'],
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
        lead="Open seating in the 1905 building next door, with the coffee, the WiFi, the parking and a locker of your own. For the weeks that don't need the same desk every day."
      />

      {/* Who it suits — a different room, not a cheaper version of the desk. */}
      <section className="mw-section">
        <div className="mw-container">
          <div className="grid items-start gap-10 md:grid-cols-12 md:gap-14">
            <div className="md:col-span-5 md:pr-6">
              <p className="mw-eyebrow mb-5">Who it suits</p>
              <h2 className="mw-h2">A different room, for a different week.</h2>
            </div>
            <div className="md:col-span-7">
              <p className="mw-body">
                A dedicated desk and a café membership are not a better and a
                worse version of the same thing. They fit different working
                weeks. The desk is for people who are in most days and want the
                same surface, the same monitor and the same drawer waiting for
                them every morning.
              </p>
              <p className="mt-5 mw-body">
                The café membership is for the other pattern: a few days a
                week, a laptop, and no particular attachment to which chair.
                You get open seating in the room next door instead of a desk
                with your name on it, half a desk member&rsquo;s booking
                credit, and the same coffee, WiFi, printing, parking and
                locker &mdash; ${CAFE.price} a month rather than
                ${DESK.price}.
              </p>
              <DeskCountLine className="mt-6" />
            </div>
          </div>
        </div>
      </section>

      {/* What $100 buys, itemised.

          This was a 5/7 split with the intro and the CTA buttons in the narrow
          left column and all eight items stacked single-file down the right.
          The list ran roughly three times the height of the column beside it,
          so the buttons sat marooned at the top of a tall empty gutter.

          Full-width intro, then the items in a two-up grid underneath: the
          list is half as tall, nothing is left hanging beside it, and the CTA
          sits under the thing it is asking you to buy. */}
      <section className="mw-section-alt">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">What&rsquo;s included</p>
            <h2 className="mw-h2">Everything except the desk.</h2>
            <p className="mt-6 mw-body">
              ${CAFE.price} a month, billed monthly. The booking credit is
              exactly half what a dedicated desk gets, which is the whole deal:
              half the price, half the credit, same building, same everything
              else.
            </p>
          </div>

          <dl className="mt-12 grid gap-x-12 gap-y-0 border-t border-clay sm:grid-cols-2 md:mt-16">
            {INCLUDED.map(([term, detail]) => (
              <div key={term} className="border-b border-clay py-6">
                <dt className="font-display text-[1.35rem] font-semibold tracking-tightest text-ink">
                  {term}
                </dt>
                <dd className="mt-2 mw-body">{detail}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/membership/apply?plan=cafe_membership" className="mw-btn-primary">
              Apply for a café membership
            </Link>
            <a href="tel:+13033598337" className="mw-btn-ghost">
              (303) 359-8337
            </a>
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

      <MoreQuestions
        lead="Still deciding between the café and a desk?"
        hash="cafe-vs-desk"
        tone="alt"
      />

      <Footer />
    </main>
  );
}
