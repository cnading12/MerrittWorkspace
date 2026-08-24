import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/Footer';
import PageHero from '@/components/marketing/PageHero';
import { BLUR } from '@/components/marketing/blur';
import { PRICES } from '@/lib/seo/site';
import { DAY_PASS_FAQS } from '@/lib/seo/faqs';

// The $30 day pass has been a real product since April but has never had a page
// of its own — it was one row in the /membership comparison table. "Day pass"
// and "drop in coworking" are the highest-intent local searches we can win
// (someone typing them is looking for a desk today, not a lease), and they lose
// to a comparison table every time. Server-rendered, no client state.

const INCLUDED = [
  ['A dedicated desk for the day', 'Not a couch and not a hot-desk scramble — a real desk with a monitor, filing storage and a power supply. Bring a laptop and you are set.'],
  ['An hour of conference room time', 'The eight-person room with the 75-inch display, if the day involves a call you would rather not take at your desk.'],
  ['Fast fibre WiFi', 'The same connection the members use, with a backup line behind it. Fine for a day of video calls.'],
  ['The kitchen, including the coffee and the beer', 'Coffee, tea and beer are free and always on. The Snackshop covers everything else.'],
  ['Printing', 'Free, and nobody will ask you what it is for.'],
  ['Free parking, right outside', 'In the lot in front of the building, or on 23rd and Irving. No meters, no garage, no app.'],
];

export default function DayPassPage() {
  return (
    <main className="bg-bone">
      <PageHero
        src="/images/dedicated-desks/room-occupied.webp"
        alt="Members working at the butcher block desk pods at Merritt Workspace, where day pass visitors get a desk of their own in Sloan's Lake, Denver"
        blurDataURL={BLUR['dedicated-desks/room-occupied']}
        objectPosition="50% 58%"
        eyebrow="Day pass &middot; Sloan&rsquo;s Lake, Denver"
        title={<>A desk for the day, ${PRICES.dayPass}.</>}
        lead="No membership, no lease, no tour required. Book a day pass, park for free out front, and work a full day in Sloan's Lake — coffee, tea and beer included."
      />

      {/* Who it's for. The three searches that land here, answered in their own words. */}
      <section className="mw-section">
        <div className="mw-container">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <p className="mw-eyebrow mb-5">Who books one</p>
              <h2 className="mw-h2">For the day you need a desk in Denver, not a contract.</h2>
            </div>
            <div className="grid gap-8 md:col-span-7 md:grid-cols-2">
              <div>
                <h3 className="mw-h3">Visiting Denver</h3>
                <p className="mt-3 mw-body">
                  In town for a few days and the hotel desk is a nightstand.
                  We are ten minutes from downtown, three from I-25, and the
                  parking is free — which is more than the hotel can say.
                </p>
              </div>
              <div>
                <h3 className="mw-h3">Working from home, badly</h3>
                <p className="mt-3 mw-body">
                  The contractors are in, the housemate took a call in the
                  kitchen, or the deadline needs a room without a laundry pile
                  in it. Come for the day and go home when it&rsquo;s done.
                </p>
              </div>
              <div>
                <h3 className="mw-h3">Trying us out</h3>
                <p className="mt-3 mw-body">
                  A day pass is the honest way to find out whether a place
                  suits you. Buy another whenever you like — once you have a
                  pass you can book more from the member portal without
                  filling in the application again.
                </p>
              </div>
              <div>
                <h3 className="mw-h3">Between offices</h3>
                <p className="mt-3 mw-body">
                  A lease ended, a move slipped, the new space isn&rsquo;t
                  ready. Buy the days you actually need rather than signing for
                  a month to cover a fortnight.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What $30 buys, itemised. */}
      <section className="mw-section-alt">
        <div className="mw-container">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <p className="mw-eyebrow mb-5">What&rsquo;s included</p>
              <h2 className="mw-h2">Everything a member gets, for one day.</h2>
              <p className="mt-6 mw-body">
                One charge of ${PRICES.dayPass}, taken when you book. There is
                no deposit, no joining fee, and nothing that renews. The only
                thing a day pass doesn&rsquo;t include is flex space booking
                credit in the 1905 hall next door — though you are welcome to
                sit in its caf&eacute; with the rest of the members.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/membership/apply?plan=one_day_dedicated_desk" className="mw-btn-primary">
                  Book a day pass
                </Link>
                <a href="tel:+17203579499" className="mw-btn-ghost">
                  (720) 357-9499
                </a>
              </div>
            </div>

            <div className="md:col-span-7">
              <dl className="mw-section-rule">
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

      {/* The building, and the practical detail people search for by name. */}
      <section className="mw-section">
        <div className="mw-container">
          <div className="grid items-center gap-12 md:grid-cols-12 md:gap-16">
            <div className="relative aspect-[4/3] md:col-span-7 md:aspect-[3/2]">
              <Image
                src="/images/exterior/campus.webp"
                alt="Merritt Workspace and the restored 1905 hall on the same lawn at 23rd and Irving in Sloan's Lake, Denver"
                fill
                placeholder="blur"
                blurDataURL={BLUR['exterior/campus']}
                sizes="(max-width: 768px) 100vw, 58vw"
                className="object-cover object-[62%_50%]"
              />
            </div>
            <div className="md:col-span-5">
              <p className="mw-eyebrow mb-5">Getting here</p>
              <h2 className="mw-h2">2246 Irving Street, at 23rd.</h2>
              <p className="mt-6 mw-body">
                On the corner of 23rd and Irving in Sloan&rsquo;s Lake, three
                minutes from I-25 and about ten from downtown Denver. The lake
                itself is a six-minute walk, which is the correct place to take
                a lunch break.
              </p>
              <p className="mt-5 mw-body">
                Park free in the lot in front of the building or on the street
                on 23rd or Irving. Come in through the main entrance any weekday
                between 8am and 6pm — the door is unlocked and there is no code
                to remember. Your pass covers the desk for the whole of the day
                you booked.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/membership/apply?plan=one_day_dedicated_desk" className="mw-btn-primary">
                  Book a day pass
                </Link>
                <Link href="/membership" className="mw-btn-ghost">
                  Compare memberships
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Staying longer is cheaper than repeat passes — say so before they work it out. */}
      <section className="mw-section-alt">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">Coming back</p>
            <h2 className="mw-h2">Past about seven days, a membership costs less.</h2>
            <p className="mt-6 mw-body">
              Seven day passes come to ${PRICES.dayPass * 7}. A dedicated desk
              is ${PRICES.dedicatedDesk} a month and comes with a desk that
              stays yours, 24/7 access, a locker, four hours of conference room
              credit a month and four hours a week in the flex space next door.
              If you are here more than a day or two a week, we would rather
              tell you that than sell you passes.
            </p>
            <p className="mt-5 mw-body">
              There is also a free trial day, which is a full day here at no
              charge for anyone seriously weighing up membership. If that
              describes you, take the trial rather than the pass.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/membership/apply?trial=1" className="mw-btn-primary">
                Book a free trial day
              </Link>
              <Link href="/membership/dedicated-desk" className="mw-btn-ghost">
                See dedicated desks
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The same four answers the page's FAQPage markup carries. They are
          rendered here because Google only honours FAQ rich results when the
          marked-up answer is one a visitor can actually read, and because
          these are the questions that decide whether someone turns up. */}
      <section className="mw-section">
        <div className="mw-container">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-4">
              <p className="mw-eyebrow mb-5">Before you come</p>
              <h2 className="mw-h2">Day pass questions.</h2>
            </div>
            <dl className="md:col-span-8">
              {DAY_PASS_FAQS.map(({ question, answer }) => (
                <div key={question} className="border-t border-clay py-7 first:border-t-0 first:pt-0">
                  <dt className="font-display text-[1.35rem] font-semibold leading-snug tracking-tightest text-ink">
                    {question}
                  </dt>
                  <dd className="mt-3 mw-body">{answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
