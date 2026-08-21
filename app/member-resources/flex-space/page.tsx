import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/Footer';
import PageHero from '@/components/marketing/PageHero';
import { BLUR } from '@/components/marketing/blur';
import FlexBooking from '@/components/flex/FlexBooking';

// The flex space, described in full and bookable in the same place.
//
// This used to live at /portal/flex-space, behind the member login, which meant
// the room nobody else in Denver has was invisible to anyone deciding whether
// to join. The page is public now: everything about the space reads without an
// account, and only the booking widget itself needs one.

export default function FlexSpacePage() {
  return (
    <main className="bg-bone">
      {/* The point of this page is that the room is a whole other building, so
          the hero shows both of them on the one lawn. The x bias only bites on
          a portrait viewport, where it keeps the 1905 building in frame. */}
      <PageHero
        src="/images/exterior/campus.webp"
        alt="The Merritt Workspace building and the restored 1905 event space side by side on the same lawn at 23rd and Irving, Sloan's Lake, Denver"
        blurDataURL={BLUR['exterior/campus']}
        objectPosition="62% 50%"
        eyebrow="Member resources &middot; Flex space"
        title={<>A 1905 event space, right next door.</>}
        lead="A restored hall with the original stained glass, a hardwood floor, a projector and a sound system — free to book with your membership, every weekday until 4:30."
      />

      {/* What it is */}
      <section className="mw-section">
        <div className="mw-container">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <p className="mw-eyebrow mb-5">The room</p>
              <h2 className="mw-h2">Not a meeting room. A whole building.</h2>
              <p className="mt-6 mw-body">
                The building next door is a restored 1905 church, and members
                get the run of it during the working day. The hall seats a
                hundred comfortably in rows, or clears completely for a
                workshop, a class or a launch. The stained glass is original,
                the floor is the original hardwood, and there is a projector, a
                drop-down screen and a sound system already in the room.
              </p>
              <p className="mt-5 mw-body">
                Run an all-hands in it. Teach something. Bring a client
                somewhere that isn&rsquo;t a coffee shop. Or take your laptop to
                the café at the front when you just want a different room to
                work in for an afternoon. There is a ping-pong table in the hall
                too, out whenever the chairs are pushed back.
              </p>
            </div>

            <div className="md:col-span-6 md:col-start-7">
              <div className="relative aspect-[4/3]">
                <Image
                  src="/images/flex-space/hall-2.webp"
                  alt="The flex space hall at Merritt Workspace set up with rows of seating facing the projector screen"
                  fill
                  placeholder="blur"
                  blurDataURL={BLUR['flex-space/hall-2']}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The facts */}
      <section className="mw-section-alt">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">How it works</p>
            <h2 className="mw-h2">Four hours a week, on the house.</h2>
          </div>

          <dl className="mt-14 grid gap-x-10 gap-y-10 border-t border-clay pt-10 sm:grid-cols-2 lg:grid-cols-4 md:mt-20">
            <div>
              <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">Included</dt>
              <dd className="mt-2 font-display text-3xl font-semibold text-ink">4 hrs<span className="text-base font-normal text-ink-60"> /week</span></dd>
              <dd className="mt-2 text-[15px] leading-relaxed text-ink-60">
                With a dedicated desk. Single and 2-desk offices get six, large
                offices eight. The week resets Monday morning and hours
                don&rsquo;t roll over.
              </dd>
            </div>
            <div>
              <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">Hours</dt>
              <dd className="mt-2 font-display text-3xl font-semibold text-ink">9&ndash;4:30</dd>
              <dd className="mt-2 text-[15px] leading-relaxed text-ink-60">
                Weekdays, Mountain Time. Book in half-hour steps, same day or up
                to 60 days out.
              </dd>
            </div>
            <div>
              <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">Beyond that</dt>
              <dd className="mt-2 font-display text-3xl font-semibold text-ink">$75<span className="text-base font-normal text-ink-60"> /hr</span></dd>
              <dd className="mt-2 text-[15px] leading-relaxed text-ink-60">
                Once your weekly hours are used. Evening and weekend events are
                quoted separately, at a member rate.
              </dd>
            </div>
            <div>
              <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">In the room</dt>
              <dd className="mt-2 font-display text-3xl font-semibold text-ink">A/V</dd>
              <dd className="mt-2 text-[15px] leading-relaxed text-ink-60">
                Projector, drop-down screen, sound system, stacking seating, and
                a ping-pong table when the chairs are away.
              </dd>
            </div>
          </dl>

          <p className="mt-12 max-w-2xl text-[15px] leading-relaxed text-ink-60">
            One thing worth planning around: setup and breakdown have to happen
            inside your booked window, so the next member can start on time.
          </p>
        </div>
      </section>

      {/* The café */}
      <section className="mw-section">
        <div className="mw-container">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-7">
              <div className="relative aspect-[4/3]">
                <Image
                  src="/images/flex-space/cafe.webp"
                  alt="Café seating with table service, hardwood floors and the original stained glass windows at Merritt Workspace, Sloan's Lake, Denver"
                  fill
                  placeholder="blur"
                  blurDataURL={BLUR['flex-space/cafe']}
                  sizes="(max-width: 768px) 100vw, 58vw"
                  className="object-cover"
                />
              </div>
            </div>
            <div className="md:col-span-5">
              <p className="mw-eyebrow mb-5">The café</p>
              <h2 className="mw-h2">Open all day, no booking needed.</h2>
              <p className="mt-6 mw-body">
                At the front of the same building, the café is open to members
                through the working day with table seating, natural light and
                the stained glass still in the windows. You don&rsquo;t book it
                and it doesn&rsquo;t touch your weekly hours — walk over and sit
                down.
              </p>
              <p className="mt-5 mw-body">
                Most members end up using their desk for heads-down work and the
                café for everything else.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Member gatherings. Deliberately undated: there is no fixed cadence
          yet, and a published schedule we then miss reads worse than none. Put
          real dates in here once they exist. */}
      <section className="mw-section-rule">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">Member gatherings</p>
            <h2 className="mw-h2">Lunches and happy hours, on us.</h2>
            <p className="mt-6 mw-body">
              Every so often we clear the hall and put something on for members
              and their guests — a networking lunch, a happy hour, an excuse to
              meet the people working on the other side of the wall. They are
              free, they are not on a set schedule, and we let members know in
              advance.
            </p>
          </div>
        </div>
      </section>

      {/* Book it */}
      <section className="mw-section-alt">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">Book the space</p>
            <h2 className="mw-h2">Check the calendar and reserve it.</h2>
          </div>
          <div className="mt-12 max-w-4xl md:mt-16">
            <FlexBooking />
          </div>
        </div>
      </section>

      {/* After 4:30 */}
      <section className="mw-section-rule">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">Evenings and weekends</p>
            <h2 className="mw-h2">After 4:30, the room changes hands.</h2>
            <p className="mt-6 mw-body">
              In the evenings and on weekends the space becomes{' '}
              <a
                href="https://merrittwellness.net"
                target="_blank"
                rel="noopener noreferrer"
                className="mw-inline-link"
              >
                Merritt Wellness
              </a>
              , with yoga, fitness and wellness classes. Workspace members book
              it at a discount for evening events, and take the classes at a
              member rate.
            </p>
            <p className="mt-5 mw-body">
              For an evening or weekend booking, call or text{' '}
              <a href="tel:7203579499" className="mw-inline-link">(720) 357-9499</a>{' '}
              or{' '}
              <Link href="/contact" className="mw-inline-link">send us a note</Link>.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
