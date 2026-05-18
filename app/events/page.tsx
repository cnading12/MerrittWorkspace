import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, Clock, MapPin, Ticket, ArrowRight, Users, Music } from 'lucide-react';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Upcoming Events | Merritt Workspace',
  description:
    "Upcoming community events, live music, and gatherings at Merritt Workspace and Merritt Wellness in Sloan's Lake, Denver.",
  alternates: { canonical: 'https://merrittworkspace.com/events' },
};

type EventItem = {
  id: string;
  title: string;
  featuring?: string;
  presenter?: string;
  date: string;
  dateISO: string;
  time: string;
  location: string;
  address: string;
  image: string;
  imageAlt: string;
  pricing: { label: string; price: string }[];
  lineup?: string[];
  vendors?: string[];
  ticketUrl?: string;
  category: 'community' | 'workshop' | 'wellness';
};

const events: EventItem[] = [
  {
    id: 'channel-one-sound-system-2026-06-07',
    title: 'Channel One Sound System',
    featuring: 'Ft. Mikey Dread & Ras Sherby',
    presenter: 'Pomegranate Sounds & Friends',
    date: 'Sunday, June 7, 2026',
    dateISO: '2026-06-07',
    time: '6:00 – 10:00 PM',
    location: 'Merritt Wellness',
    address: '2246 Irving St, Denver, Colorado',
    image: '/images/events/community/Channel One Sound System June 7, 2026.png',
    imageAlt:
      'Channel One Sound System flyer featuring Mikey Dread and Ras Sherby at Merritt Wellness on Sunday June 7, 2026 from 6 to 10 PM',
    pricing: [
      { label: 'Early Bird', price: '$20' },
      { label: 'Supporters', price: '$30' },
      { label: 'At The Door', price: '$35' },
    ],
    lineup: [
      'The Groove Thief',
      'Mister Niño',
      'Ras Drew (One Drum)',
      'Slim',
      'DJ Soul Rock',
    ],
    vendors: ['Denver Doubles', 'Pom Vinyl Shop', 'Exodus Art'],
    ticketUrl: 'https://theticketing.co/e/pschannelone',
    category: 'community',
  },
];

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-orange-50 via-white to-orange-50 pt-32 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Calendar className="w-4 h-4" />
            Community at Merritt
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Upcoming Events
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Live music, workshops, and community gatherings hosted at Merritt
            Workspace and Merritt Wellness in Sloan&apos;s Lake.
          </p>
        </div>
      </section>

      {/* Event list */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {events.map((event) => (
            <article
              key={event.id}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="grid lg:grid-cols-2 gap-0">
                {/* Full flyer image */}
                <div className="relative bg-gray-50 flex items-center justify-center p-6">
                  <div className="relative w-full" style={{ maxWidth: 600 }}>
                    <Image
                      src={event.image}
                      alt={event.imageAlt}
                      width={1080}
                      height={1350}
                      sizes="(min-width: 1024px) 600px, 100vw"
                      className="w-full h-auto rounded-xl shadow-lg"
                      priority
                    />
                  </div>
                </div>

                {/* Event details */}
                <div className="p-8 md:p-10 flex flex-col">
                  {event.presenter && (
                    <div className="inline-flex items-center gap-2 text-orange-600 font-semibold text-sm uppercase tracking-wide mb-3">
                      <Music className="w-4 h-4" />
                      {event.presenter}
                    </div>
                  )}
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    {event.title}
                  </h2>
                  {event.featuring && (
                    <p className="text-lg text-gray-700 font-medium mb-6">
                      {event.featuring}
                    </p>
                  )}

                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-gray-900">
                          <time dateTime={event.dateISO}>{event.date}</time>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                      <div className="text-gray-700">{event.time}</div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                      <div>
                        <div className="font-semibold text-gray-900">
                          {event.location}
                        </div>
                        <div className="text-gray-600 text-sm">
                          {event.address}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-5 mb-6">
                    <div className="flex items-center gap-2 mb-3 text-orange-800 font-semibold">
                      <Ticket className="w-4 h-4" />
                      Tickets
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {event.pricing.map((p) => (
                        <div
                          key={p.label}
                          className="bg-white rounded-lg p-3 text-center border border-orange-100"
                        >
                          <div className="text-2xl font-bold text-gray-900">
                            {p.price}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {p.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lineup & vendors */}
                  {(event.lineup || event.vendors) && (
                    <div className="grid sm:grid-cols-2 gap-4 mb-8">
                      {event.lineup && (
                        <div>
                          <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
                            <Music className="w-4 h-4 text-orange-600" />
                            Lineup
                          </div>
                          <ul className="text-gray-700 text-sm space-y-1">
                            {event.lineup.map((act) => (
                              <li key={act}>• {act}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {event.vendors && (
                        <div>
                          <div className="flex items-center gap-2 text-gray-900 font-semibold mb-2">
                            <Users className="w-4 h-4 text-orange-600" />
                            Food & Vendors
                          </div>
                          <ul className="text-gray-700 text-sm space-y-1">
                            {event.vendors.map((v) => (
                              <li key={v}>• {v}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {event.ticketUrl && (
                    <div className="mt-auto">
                      <a
                        href={event.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center w-full sm:w-auto bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-orange-700 transition shadow-md"
                      >
                        Get Tickets
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-br from-orange-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Want to host an event at Merritt?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Our flex space converts to Merritt Wellness in the evenings and on
            weekends — available to book for live music, workshops, and private
            events.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-orange-700 transition shadow-lg"
          >
            Get in touch
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
