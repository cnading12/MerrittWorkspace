import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/Footer';
import Essentials from '@/components/marketing/Essentials';
import FaqBlock from '@/components/marketing/FaqBlock';
import { BLUR } from '@/components/marketing/blur';
import { SITE_URL } from '@/lib/seo/business';

// The questions someone puts to an assistant before choosing a workspace, in
// the order they tend to ask them. Answered on the homepage itself so a single
// fetch of this page settles all of them.
const HOME_FAQ_IDS = [
  'how-much-does-it-cost',
  'twenty-four-seven',
  'parking',
  'commitment',
  'free-trial',
  'compare-to-chains',
];

// No client state on this page any more — the hero carousel is gone, so the
// whole thing renders on the server.

export default function HomePage() {
  return (
    <div className="bg-bone">

      {/* ─── 1. Hero ─────────────────────────────────────────────────────
          Interior, not exterior. The first question a prospect asks is what
          it feels like to work here. One still, full-bleed, no carousel. */}
      {/* Starts at y=0 with nothing above it: the navbar is transparent over
          this section and only takes its solid treatment on scroll. */}
      <section className="relative h-hero w-full overflow-hidden">
        {/* Biased down: the desks and the people at them sit in the lower half
            of this frame, so a centre crop on a wide viewport trades them for
            ceiling. */}
        <Image
          src="/images/dedicated-desks/room-wide.webp"
          alt="Members at work in the butcher block desk pods at Merritt Workspace, a coworking space in Sloan's Lake, Denver"
          fill
          priority
          placeholder="blur"
          blurDataURL={BLUR['dedicated-desks/room-wide']}
          sizes="100vw"
          quality={90}
          className="object-cover object-[50%_60%]"
        />
        {/* Directional scrim, only under the text. */}
        <div className="absolute inset-0 scrim-bottom md:hidden" aria-hidden="true" />
        <div className="absolute inset-0 hidden scrim-left md:block" aria-hidden="true" />
        {/* Top scrim so the transparent nav's light marks stay readable. */}
        <div className="absolute inset-x-0 top-0 h-40 scrim-nav" aria-hidden="true" />

        <div className="absolute inset-0 flex items-end">
          {/* pt-28 keeps the headline clear of the fixed bar on short viewports. */}
          <div className="mx-auto w-full max-w-7xl px-5 pt-28 pb-12 sm:px-8 md:pb-20 lg:pb-24">
            {/* Width in rem, not ch: a ch on this wrapper resolves against the
                16px body font, not the display size on the h1. */}
            <div className="md:max-w-2xl lg:max-w-[52rem]">
              {/* Carries the primary local term that the old H1 held, so
                  the headline below can stay human. */}
              <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.18em] text-bone/75 md:mb-5 md:text-[13px]">
                Coworking in Sloan&rsquo;s Lake, Denver
              </p>
              <h1 className="font-display text-[2.15rem] font-semibold leading-[1] tracking-tightest text-bone sm:text-5xl md:text-7xl md:leading-[0.95] lg:text-[5.75rem]">
                A desk, an office, and a 1905 event space in Sloan&rsquo;s Lake.
              </h1>
            </div>
            <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-bone/85 md:mt-8 md:text-lg">
              Dedicated desks from $200 a month and private offices from $500,
              three minutes from I-25, with free parking on site and coffee,
              tea and beer included.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10 md:gap-4">
              <Link
                href="/membership/apply?trial=1"
                className="inline-flex items-center justify-center bg-accent px-7 py-4 text-[15px] font-medium text-white transition hover:bg-accent-deep"
              >
                Book a free trial day
              </Link>
              <a
                href="tel:7203579499"
                className="inline-flex items-center justify-center border border-bone/40 px-7 py-4 text-[15px] font-medium text-bone transition hover:border-bone hover:bg-bone hover:text-ink"
              >
                (720) 357-9499
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. The dedicated desk ───────────────────────────────────────
          Image left, bleeding off the left margin. 7/5 split, not 50/50. */}
      <section className="py-20 md:py-32">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid items-center gap-10 md:grid-cols-12 md:gap-16">
            {/* The cohort shot: the section is about the room being full of
                people who keep the same desk, so the photograph shows them.
                Natively 3:2, so the desktop frame is an exact fit and only the
                4:3 mobile crop takes anything off the sides. */}
            <div className="relative aspect-[4/3] md:col-span-7 md:aspect-[3/2]">
              <Image
                src="/images/dedicated-desks/members-talking.webp"
                alt="Members talking between the butcher block desk pods in the dedicated desk room at Merritt Workspace, Sloan's Lake, Denver"
                fill
                placeholder="blur"
                blurDataURL={BLUR['dedicated-desks/members-talking']}
                sizes="(max-width: 768px) 100vw, 58vw"
                className="object-cover object-center"
              />
            </div>

            <div className="px-5 sm:px-8 md:col-span-5 md:pr-12 lg:pr-20">
              <p className="mb-5 text-[13px] font-medium uppercase tracking-[0.18em] text-ink-60">
                Dedicated desk
              </p>
              <h2 className="font-display text-[2rem] font-semibold leading-[1.02] tracking-tightest text-ink sm:text-4xl lg:text-[3.5rem]">
                A dedicated desk of your own, $200 a month.
              </h2>
              <p className="mt-6 text-[17px] leading-relaxed text-ink-60 md:text-lg">
                Not a hot desk you fight for at nine in the morning. The same
                desk every day, in a room with twenty-five of them. Your own
                access code gets you in around the clock, and the membership
                comes with a numbered locker, four hours of conference room credit
                a month, five soundproof phone booths for when a call needs a
                door, and coffee, tea and beer on the house.
              </p>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-60 md:text-lg">
                It also comes with the building next door. The café is open to
                members through the day, with table seating, natural light and
                the stained glass still in the windows, and the flex space
                behind it comes with four hours of booking credit a week, free
                until 4:00 every afternoon. Most members use the desk for
                heads-down work and the café for everything else.
              </p>
              <Link
                href="/membership/dedicated-desk"
                className="mt-8 inline-block border-b border-accent pb-1 text-[15px] font-medium text-accent-deep transition hover:border-accent-deep"
              >
                More on dedicated desks
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. Private offices ──────────────────────────────────────────
          A triptych of deliberately unequal heights. No cards, no shadows,
          no borders — prices set as type under a hairline rule. */}
      <section className="border-t border-clay bg-linen py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="mb-5 text-[13px] font-medium uppercase tracking-[0.18em] text-ink-60">
              Private offices
            </p>
            <h2 className="font-display text-[2rem] font-semibold leading-[1.02] tracking-tightest text-ink sm:text-4xl lg:text-[3.5rem]">
              Private office rentals in Denver, $500 to $1,200.
            </h2>
            <p className="mt-6 text-[17px] leading-relaxed text-ink-60 md:text-lg">
              Fourteen lockable offices with a business address, sized for one
              person up to a team of eight, and the most flexible office space
              in Sloan&rsquo;s Lake.
            </p>
          </div>

          {/* Two photographs, same landscape crop, same size, both with the
              room in use — an empty desk next to a full one read as two
              different products. Single and Large are the two ends of the
              range; Double is set as type below. */}
          <div className="mt-14 grid gap-8 md:mt-20 md:grid-cols-2 md:gap-10">
            <figure>
              <div className="relative aspect-[3/2]">
                <Image
                  src="/images/offices/single-occupied.webp"
                  alt="A member working at the ultrawide monitor in a single private office at Merritt Workspace, Sloan's Lake, Denver"
                  fill
                  placeholder="blur"
                  blurDataURL={BLUR['offices/single-occupied']}
                  sizes="(max-width: 768px) 100vw, 46vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-4 text-[13px] uppercase tracking-[0.14em] text-ink-60">
                Single office
              </figcaption>
            </figure>

            <figure>
              <div className="relative aspect-[3/2]">
                <Image
                  src="/images/offices/large-team.webp"
                  alt="A team working together in the large private office at Merritt Workspace, Denver"
                  fill
                  placeholder="blur"
                  blurDataURL={BLUR['offices/large-team']}
                  sizes="(max-width: 768px) 100vw, 46vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-4 text-[13px] uppercase tracking-[0.14em] text-ink-60">
                Large office
              </figcaption>
            </figure>
          </div>

          <div className="mt-14 grid gap-y-8 border-t border-clay pt-10 sm:grid-cols-3 sm:gap-8 md:mt-20">
            <div>
              <h3 className="font-display text-2xl font-semibold text-ink">Single</h3>
              <p className="mt-1.5 text-[15px] text-ink-60">One person · 14 hrs/mo meeting credit · 6 hrs/wk flex space</p>
              <p className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink">
                $500<span className="text-base font-normal text-ink-60"> /mo</span>
              </p>
            </div>
            <div>
              <h3 className="font-display text-2xl font-semibold text-ink">Double</h3>
              <p className="mt-1.5 text-[15px] text-ink-60">Two people · 14 hrs/mo meeting credit · 6 hrs/wk flex space</p>
              <p className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink">
                $700<span className="text-base font-normal text-ink-60"> /mo</span>
              </p>
            </div>
            <div>
              <h3 className="font-display text-2xl font-semibold text-ink">Large</h3>
              <p className="mt-1.5 text-[15px] text-ink-60">Four to eight people · 20 hrs/mo meeting credit · 8 hrs/wk flex space</p>
              <p className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink">
                $1,200<span className="text-base font-normal text-ink-60"> /mo</span>
              </p>
            </div>
          </div>

          <Link
            href="/membership/private-office"
            className="mt-12 inline-block border-b border-accent pb-1 text-[15px] font-medium text-accent-deep transition hover:border-accent-deep"
          >
            See office options
          </Link>
        </div>
      </section>

      {/* ─── 4. The flex space ─────────────────────────────────────────
          The differentiator. Full-bleed, tallest section on the page, the
          least competition for the photograph. */}
      <section className="relative">
        <div className="relative h-[86svh] min-h-[600px] w-full overflow-hidden md:h-[95svh] md:max-h-[1000px]">
          <Image
            src="/images/flex-space/rose-window-group.webp"
            alt="Members gathered under the stained glass rose window in the restored 1905 flex space at Merritt Workspace, Sloan's Lake, Denver"
            fill
            placeholder="blur"
            blurDataURL={BLUR['flex-space/rose-window-group']}
            sizes="100vw"
            quality={90}
            className="object-cover object-center"
          />
          <div className="absolute inset-0 scrim-bottom" aria-hidden="true" />

          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto w-full max-w-7xl px-5 pb-14 sm:px-8 md:pb-24">
              <div className="max-w-3xl">
                <p className="mb-5 text-[13px] font-medium uppercase tracking-[0.18em] text-bone/75">
                  The flex space
                </p>
                <h2 className="font-display text-[2.25rem] font-semibold leading-[1] tracking-tightest text-bone sm:text-5xl lg:text-[4.5rem]">
                  A 1905 event space, right next door.
                </h2>
                <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-bone/85 md:text-lg">
                  A restored hall with the original stained glass, a hardwood
                  floor, a projector and a sound system, seating a hundred
                  comfortably. Every membership includes weekly booking credit
                  &mdash; four hours a week with a desk, six to eight with an
                  office &mdash; free every day until 4:00. Run a workshop in
                  it, hold an all-hands, bring a client, or take your laptop to
                  the café seating when you want a different room. No other
                  coworking space in Denver has anything like it.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* The café and the campus, then the after-4:00 note. */}
        <div className="border-t border-clay bg-bone">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-24">
            {/* 5/7 split: a 4:3 café frame and a 1.89 hall frame land at
                near-identical heights, so the row reads as one band. The hall
                shot is natively 4:3 with an empty floor across the bottom, so
                its crop is biased up onto the windows and the seating. */}
            <div className="grid gap-8 md:grid-cols-12 md:gap-10">
              <figure className="md:col-span-5">
                <div className="relative aspect-[4/3]">
                  <Image
                    src="/images/flex-space/cafe.webp"
                    alt="Café seating with table service, hardwood floors and the original stained glass windows at Merritt Workspace, Sloan's Lake, Denver"
                    fill
                    sizes="(max-width: 768px) 100vw, 40vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="mt-4 text-[13px] uppercase tracking-[0.14em] text-ink-60">
                  The café, open to members all day
                </figcaption>
              </figure>

              <figure className="md:col-span-7">
                <div className="relative aspect-[189/100]">
                  {/* The hall as members actually find it: seating out, screen
                      down, ping-pong table off to the side. */}
                  <Image
                    src="/images/flex-space/hall-1.webp"
                    alt="The restored 1905 hall at Merritt Workspace, with original stained glass, a hardwood floor, a projector screen, rows of seating and a ping-pong table, in Sloan's Lake, Denver"
                    fill
                    sizes="(max-width: 768px) 100vw, 56vw"
                    className="object-cover object-[50%_35%]"
                  />
                </div>
                <figcaption className="mt-4 text-[13px] uppercase tracking-[0.14em] text-ink-60">
                  The hall next door, free to book
                </figcaption>
              </figure>
            </div>

            <div className="mt-14 max-w-2xl md:mt-16">
              <h3 className="font-display text-2xl font-semibold leading-tight tracking-tight text-ink md:text-3xl">
                After 4:00, the room changes hands.
              </h3>
              <p className="mt-4 text-[17px] leading-relaxed text-ink-60 md:text-lg">
                In the evenings and on weekends the space becomes{' '}
                <a
                  href="https://merrittwellness.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-b border-accent pb-0.5 text-accent-deep transition hover:border-accent-deep"
                >
                  Merritt Wellness
                </a>
                , with yoga, fitness and wellness classes. Workspace members
                book it at a discount for evening events, and take the classes
                at a member rate.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. Rooms and the rest ───────────────────────────────────────
          Image right this time, with an offset vertical. The old eight-up
          icon grid lives here as prose. */}
      <section className="border-t border-clay bg-linen py-20 md:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid items-center gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <p className="mb-5 text-[13px] font-medium uppercase tracking-[0.18em] text-ink-60">
                What comes with it
              </p>
              <h2 className="font-display text-[2rem] font-semibold leading-[1.02] tracking-tightest text-ink sm:text-4xl lg:text-[3.25rem]">
                A conference room, coffee, and a locker of your own.
              </h2>
              <p className="mt-6 text-[17px] leading-relaxed text-ink-60 md:text-lg">
                A conference room with a 75-inch screen and conference calling,
                bookable from the member portal and drawn against the credit
                your membership already includes. Five soundproof phone booths
                for when a call needs a door. Enterprise WiFi, a numbered locker, and a 24/7
                access code for a monitored building.
              </p>
              <p className="mt-5 text-[17px] leading-relaxed text-ink-60 md:text-lg">
                A full kitchen, a snackshop you can charge to your account, and
                all the coffee, tea and beer you can drink.
              </p>
              <Link
                href="/member-resources/meeting-rooms"
                className="mt-8 inline-block border-b border-accent pb-1 text-[15px] font-medium text-accent-deep transition hover:border-accent-deep"
              >
                The conference room and rates
              </Link>
            </div>

            <div className="md:col-span-7">
              <div className="relative aspect-[3/2]">
                <Image
                  src="/images/conference-room/meeting.webp"
                  alt="A team meeting in the conference room at Merritt Workspace coworking in Sloan's Lake, Denver"
                  fill
                  placeholder="blur"
                  blurDataURL={BLUR['conference-room/meeting']}
                  sizes="(max-width: 768px) 100vw, 58vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. Location ─────────────────────────────────────────────────
          The quiet section. Mostly whitespace, address set as type, map
          stripped of its chrome. */}
      <section className="border-t border-clay py-20 md:py-36">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-14 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <p className="mb-5 text-[13px] font-medium uppercase tracking-[0.18em] text-ink-60">
                Visit
              </p>
              <h2 className="font-display text-[2rem] font-semibold leading-[1.02] tracking-tightest text-ink sm:text-4xl lg:text-[3.5rem]">
                Coworking at 2246 Irving Street, Sloan&rsquo;s Lake.
              </h2>
              <p className="mt-6 max-w-md text-[17px] leading-relaxed text-ink-60 md:text-lg">
                At 23rd and Irving in Sloan&rsquo;s Lake, next to the landmark
                Merritt building. Three minutes to I-25, five to Mile High, and
                a walk from Sloan&rsquo;s Lake Park, the cafés and the
                restaurants on the west side.
              </p>

              <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-7 border-t border-clay pt-8">
                <div>
                  <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">Offices</dt>
                  <dd className="mt-1 font-display text-3xl font-semibold text-ink">14</dd>
                </div>
                <div>
                  <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">Desks</dt>
                  <dd className="mt-1 font-display text-3xl font-semibold text-ink">25</dd>
                </div>
                <div>
                  <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">Parking</dt>
                  <dd className="mt-1 font-display text-3xl font-semibold text-ink">Free on site</dd>
                </div>
                <div>
                  <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">Access</dt>
                  <dd className="mt-1 font-display text-3xl font-semibold text-ink">24/7</dd>
                </div>
              </dl>

              <div className="mt-12">
                <Link
                  href="/membership/apply?trial=1"
                  className="inline-flex items-center justify-center bg-accent px-7 py-4 text-[15px] font-medium text-white transition hover:bg-accent-deep"
                >
                  Book a free trial day
                </Link>
                <p className="mt-5 text-[15px] text-ink-60">
                  A full day in the space before you commit to anything. Call or
                  text{' '}
                  <a href="tel:7203579499" className="border-b border-clay pb-0.5 text-ink transition hover:border-ink">
                    (720) 357-9499
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className="md:col-span-7">
              <div className="relative aspect-[3/2]">
                <Image
                  src="/images/exterior/signage.webp"
                  alt="Exterior of Merritt Workspace at 2246 Irving Street, a coworking space in Sloan's Lake, Denver"
                  fill
                  placeholder="blur"
                  blurDataURL={BLUR['exterior/signage']}
                  sizes="(max-width: 768px) 100vw, 58vw"
                  className="object-cover"
                />
              </div>
              <div className="mt-6 h-[280px] w-full border border-clay md:h-[340px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3067.4953180826856!2d-105.03225422342487!3d39.75098609588881!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x876c7932ec70db2b%3A0x8c38dd4cf4df270d!2sMerritt%20Workspace!5e0!3m2!1sen!2sus!4v1759948992207!5m2!1sen!2sus"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Merritt Workspace - Coworking Space at 2246 Irving Street, Sloan's Lake, Denver, CO 80211"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Essentials />

      <FaqBlock ids={HOME_FAQ_IDS} id={`${SITE_URL}/#faq`} />

      <Footer />
    </div>
  );
}
