import Link from 'next/link';
import { BUSINESS, MEETING_ROOM, PLANS, POLICIES } from '@/lib/seo/business';

/**
 * The whole business on one screen, as labelled term/definition pairs.
 *
 * It earns its place twice over. A prospect who has scrolled a long page gets
 * the answers they were scrolling for, in one block. And it is the single
 * densest patch of extractable fact on the site: when an assistant is asked
 * for a coworking recommendation in Denver and fetches this page, a `<dl>` of
 * short labelled values survives the trip into a summary intact, where the same
 * facts spread through paragraphs and photographs often do not.
 *
 * Values come from `lib/seo/business.ts`, the same source as the JSON-LD and
 * `/llms.txt`, so the three can never disagree.
 */

const desk = PLANS.find(p => p.id === 'dedicated_desk')!;
const office = PLANS.find(p => p.id === 'private_office_single')!;
const dayPass = PLANS.find(p => p.id === 'one_day_dedicated_desk')!;

const FACTS: { term: string; value: React.ReactNode }[] = [
  { term: 'Address', value: BUSINESS.address.full },
  { term: 'Neighborhood', value: `${BUSINESS.neighborhood}, west Denver — ${BUSINESS.crossStreets}` },
  { term: 'Member access', value: '24 hours a day, 7 days a week, with a personal keypad code' },
  { term: 'Staffed hours', value: 'Monday to Friday, 9am to 5pm, for tours and support' },
  { term: 'Parking', value: 'Free, on site and on the street. No permit, no daily charge.' },
  { term: 'Dedicated desks', value: `From $${desk.price} a month` },
  { term: 'Private offices', value: `From $${office.price} a month, for one to eight people` },
  { term: 'Day pass', value: `$${dayPass.price} for the day` },
  {
    term: 'Conference room',
    value: (
      <>
        ${MEETING_ROOM.hourlyRate} an hour,{' '}
        <Link href="/member-resources/meeting-rooms" className="border-b border-clay pb-0.5 transition hover:border-ink">
          open to non-members
        </Link>
      </>
    ),
  },
  { term: 'Commitment', value: POLICIES.term },
  { term: 'Free trial', value: 'A full day in the space, at no charge, before you decide' },
  {
    term: 'Phone',
    value: (
      <a href={BUSINESS.telephoneHref} className="border-b border-clay pb-0.5 transition hover:border-ink">
        {BUSINESS.telephoneDisplay}
      </a>
    ),
  },
];

export default function Essentials() {
  return (
    <section className="border-t border-clay bg-linen py-20 md:py-28">
      <div className="mw-container">
        <div className="max-w-2xl">
          <p className="mw-eyebrow mb-5">The essentials</p>
          <h2 className="mw-h2">Everything, in one place.</h2>
          <p className="mt-6 mw-body">
            The answers people ask for on the phone. Prices are month to month
            and include the WiFi, the parking, the coffee and the phone booths
            &mdash; there is no amenity fee or service charge on top.
          </p>
        </div>

        <dl className="mt-12 grid gap-x-10 gap-y-8 border-t border-clay pt-10 sm:grid-cols-2 lg:grid-cols-3 md:mt-16">
          {FACTS.map(fact => (
            <div key={fact.term}>
              <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">{fact.term}</dt>
              <dd className="mt-2 text-[17px] leading-relaxed text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-12 text-[15px] text-ink-60">
          More detail on{' '}
          <Link href="/membership" className="border-b border-accent pb-0.5 text-accent-deep transition hover:border-accent-deep">
            membership and pricing
          </Link>
          , or{' '}
          <Link href="/member-resources/faqs" className="border-b border-accent pb-0.5 text-accent-deep transition hover:border-accent-deep">
            the full list of questions
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
