import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/Footer';
import PageHero from '@/components/marketing/PageHero';
import { BLUR } from '@/components/marketing/blur';
import { buildingAgeYears } from '@/lib/seo/business';

export default function AboutPage() {
  return (
    <main className="bg-bone">
      {/* The source frame is 4:3 and its bottom third is all lawn, so a centre
          crop fills the hero with grass and clips the tower. Biasing the crop
          up sits the building in the middle of the band that actually shows. */}
      <PageHero
        src="/images/flex-space/exterior.webp"
        alt="The restored 1905 Merritt church building at 23rd and Irving in Sloan's Lake, Denver"
        blurDataURL={BLUR['flex-space/exterior']}
        objectPosition="50% 18%"
        eyebrow="About"
        title={<>A church from 1905, still getting people in a room together.</>}
        lead="For over a century this was the heart of Sloan's Lake. It still is. The people in it just work for themselves now."
      />

      {/* The story — heading left, prose right.

          The two columns used to be 4 and 7 with the second starting at 6,
          which left a whole empty column down the middle of the section and a
          short heading stranded at the top of a long block of text. 5 and 7,
          adjacent, closes the gap; `items-start` keeps the heading beside the
          first paragraph instead of centred against the whole column. */}
      <section className="mw-section">
        <div className="mw-container">
          <div className="grid items-start gap-10 md:grid-cols-12 md:gap-14">
            <div className="md:col-span-5 md:pr-6">
              <p className="mw-eyebrow mb-5">Our story</p>
              <h2 className="mw-h2">Where history meets the working day.</h2>
              {/* The line that used to be a pull quote hanging off the bottom
                  of the prose column. Set here as a standfirst instead: it
                  still carries the weight, it no longer interrupts the story
                  it was quoting, and it fills the column the heading would
                  otherwise leave empty for the length of three paragraphs. */}
              <p className="mt-8 text-[19px] leading-relaxed text-ink md:mt-10 md:text-xl">
                We are not the biggest or the flashiest workspace in Denver. We
                are the one in a neighborhood, in a building that mattered to it.
              </p>
            </div>
            <div className="md:col-span-7">
              <div className="space-y-6">
                <p className="mw-body">
                  When Merritt Church closed after serving Sloan&rsquo;s Lake for
                  more than a hundred years, Lance Nading bought it rather than
                  watch it come down. The idea was not to preserve a building.
                  It was to keep the thing the building did: put people in the
                  same room on purpose.
                </p>
                <p className="mw-body">
                  He restored the sanctuary and the adjacent structure into
                  Merritt Workspace, keeping the soaring ceilings, the original
                  wood floors, the stained glass and the acoustics that make the
                  room what it is. The burnt orange concrete floors on the
                  workspace side went in during that restoration, poured to pick
                  up the warmth of the brick rather than fight it.
                </p>
                <p className="mw-body">
                  The former sanctuary is now the flex space and the café: member
                  gatherings, workshops, fitness classes. Next door, fourteen
                  offices and twenty-five dedicated desks hold everyone from
                  solo freelancers to teams of eight.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why members choose us — rules and prose, no icon cards. */}
      <section className="mw-section-alt">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">Why members stay</p>
            <h2 className="mw-h2">A neighborhood institution, not a chain.</h2>
          </div>

          <div className="mt-14 grid gap-x-10 gap-y-12 border-t border-clay pt-10 sm:grid-cols-2 lg:grid-cols-3 md:mt-20">
            <div>
              <h3 className="mw-h3">Historic character</h3>
              <p className="mt-4 mw-body">
                A restored 1905 landmark with original stained glass and
                soaring ceilings. It does not look like anywhere else you could
                rent a desk in Denver.
              </p>
            </div>
            <div>
              <h3 className="mw-h3">Actual community</h3>
              <p className="mt-4 mw-body">
                We are the only business on a residential block. Members know
                each other, and the neighborhood knows us. That is not a
                marketing line. It is a result of where the building sits.
              </p>
            </div>
            <div>
              <h3 className="mw-h3">Room to grow</h3>
              <p className="mt-4 mw-body">
                Start at a $200 dedicated desk, move into a private office when
                the work demands it, and take the large office when the team is
                eight. Nobody has to leave to get bigger.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Location — map de-chromed, photo alongside. */}
      <section className="mw-section-rule">
        <div className="mw-container">
          <div className="grid items-center gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <p className="mw-eyebrow mb-5">The neighborhood</p>
              <h2 className="mw-h2">Quiet block, five minutes from everything.</h2>
              <p className="mt-6 mw-body">
                23rd and Irving is a residential corner: trees, lawns, people
                walking dogs. It is also three minutes to I-25, five to Mile
                High, and a short walk to Sloan&rsquo;s Lake Park and the cafés
                and restaurants on the west side.
              </p>

              <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-7 border-t border-clay pt-8">
                <div>
                  <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">Established</dt>
                  <dd className="mt-1 font-display text-3xl font-semibold text-ink">1905</dd>
                </div>
                <div>
                  <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">Offices</dt>
                  <dd className="mt-1 font-display text-3xl font-semibold text-ink">14</dd>
                </div>
                <div>
                  <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">To I-25</dt>
                  <dd className="mt-1 font-display text-3xl font-semibold text-ink">3 min</dd>
                </div>
                <div>
                  <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">Access</dt>
                  <dd className="mt-1 font-display text-3xl font-semibold text-ink">24/7</dd>
                </div>
              </dl>
            </div>

            <div className="md:col-span-7">
              <div className="relative aspect-[3/2]">
                <Image
                  src="/images/exterior/campus.webp"
                  alt="The Merritt Workspace building and the 1905 event space side by side on one lawn in Sloan's Lake, Denver"
                  fill
                  sizes="(max-width: 768px) 100vw, 58vw"
                  className="object-cover"
                />
              </div>
              <div className="mt-6 h-[280px] w-full border border-clay md:h-[320px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3067.4953180826856!2d-105.03225422342487!3d39.75098609588881!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x876c7932ec70db2b%3A0x8c38dd4cf4df270d!2sMerritt%20Workspace!5e0!3m2!1sen!2sus!4v1759948992207!5m2!1sen!2sus"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Merritt Workspace, 2246 Irving Street, Sloan's Lake, Denver"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promise + CTA */}
      <section className="border-t border-clay bg-ink py-20 text-bone md:py-32">
        <div className="mw-container">
          <div className="max-w-3xl">
            <p className="mb-5 text-[12px] font-medium uppercase tracking-[0.18em] text-bone/60 md:text-[13px]">
              Our promise
            </p>
            <h2 className="font-display text-[2rem] font-semibold leading-[1.02] tracking-tightest text-bone sm:text-4xl lg:text-[3.25rem]">
              A place where your business can grow and you are not a badge number.
            </h2>
            <p className="mt-7 max-w-2xl text-[17px] leading-relaxed text-bone/70 md:text-lg">
              We honor what this building was by making it a place where real
              community happens, where the work gets done, the connections are
              worth having, and you belong somewhere. That has been the job here
              for {buildingAgeYears()} years.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href="/membership" className="mw-btn bg-accent text-white hover:bg-accent-deep">
                Explore membership
              </Link>
              <Link href="/membership/apply?trial=1" className="mw-btn border border-bone/40 text-bone hover:bg-bone hover:text-ink">
                Book a free trial day
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
