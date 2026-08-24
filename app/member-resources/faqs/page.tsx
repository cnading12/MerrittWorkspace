"use client";

import { useState } from 'react';
import { Calendar, Clock, Coffee, Key, Mail, MapPin, Phone } from 'lucide-react';
import Footer from "@/components/Footer";
import Link from 'next/link';
import PageHero from '@/components/marketing/PageHero';
import { BLUR } from '@/components/marketing/blur';

interface FAQItem {
  id: string;
  question: string;
  answer: string | JSX.Element;
  category: string;
}

const CATEGORIES = [
  { id: 'all', name: 'All questions' },
  { id: 'access', name: 'Access & security' },
  { id: 'amenities', name: 'Amenities' },
  { id: 'policies', name: 'Policies' },
  { id: 'membership', name: 'Membership & billing' },
  { id: 'location', name: 'Location & parking' },
  { id: 'technical', name: 'Technical' },
  { id: 'general', name: 'General' },
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<string[]>(['access']); // Start with first item open
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleItem = (id: string) => {
    setOpenItems(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const faqData: FAQItem[] = [
    {
      id: 'access',
      category: 'access',
      question: 'How do I get access to the building? Do I need an access code?',
      answer: (
        <div className="space-y-3">
          <p>Getting access to Merritt Workspace is simple:</p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start">
              <Clock className="w-4 h-4 text-accent-deep mt-1 mr-2 flex-shrink-0" />
              <span><strong>Business hours — Monday through Friday, 8am – 6pm:</strong> The building is unlocked and open for all members. <strong>No access code is needed</strong> — just walk in through the main entrance.</span>
            </li>
            <li className="flex items-start">
              <Key className="w-4 h-4 text-accent-deep mt-1 mr-2 flex-shrink-0" />
              <span><strong>Late evenings, weekends, and holidays:</strong> The door is locked, so this is the <em>only</em> time you need a personal access code. It&rsquo;s included with your membership at no extra charge — request one from your member portal or email member services if you plan to come in outside business hours.</span>
            </li>
          </ul>
          <div className="bg-linen p-3 border border-clay">
            <p className="text-ink-60 text-sm">
              <strong>✅ In short:</strong> if you&rsquo;re coming in on a weekday between 8am and 6pm, you don&rsquo;t need an access code at all.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'door-lock',
      category: 'access',
      question: 'How do I lock and unlock the front door after hours?',
      answer: (
        <div className="space-y-4">
          <p>
            Our front door uses a keypad system for secure after-hours access. You only need it
            outside of business hours — <strong>Monday through Friday, 8am – 6pm, the door is
            unlocked and no code is required</strong>.
          </p>

          <div className="bg-linen p-4 border">
            <h4 className="font-semibold text-ink mb-2">📹 Video Tutorial</h4>
            <p className="text-sm text-ink-60">
              For security reasons, the keypad tutorial video is no longer hosted publicly.
              We sent it to you in the email titled <strong>&ldquo;Your Merritt Workspace Access Code&rdquo;</strong> when
              your access code was issued — please check your inbox (and spam folder) for that message.
            </p>
            <p className="text-sm text-ink-60 mt-2">
              If you can&rsquo;t find the email or have any questions, reach out to member services at{' '}
              <a href="mailto:memberservices@merrittworkspace.net" className="text-accent-deep underline">
                memberservices@merrittworkspace.net
              </a>
              .
            </p>
          </div>

          <div className="bg-linen p-4 border border-clay">
            <p className="text-ink-60 mb-2"><strong>🔑 Access Code Setup</strong></p>
            <p className="text-ink-60 text-sm">
              Your unique access code is available on request once your membership starts —
              you only need one if you come in during the late evening or on weekends. During
              business hours (Mon – Fri, 8am – 6pm) the building is already unlocked. The code
              works 24/7 and is personal to your membership.
            </p>
          </div>

          <div className="bg-linen p-3 border border-clay">
            <p className="text-ink-60 text-sm">
              <strong>💡 Pro Tip:</strong> The keypad has a backlight that activates when you approach,
              making it easy to use even in low light conditions.
            </p>
          </div>

          <p className="text-sm text-ink-60">
            If you have any issues with the keypad system, please contact our support team immediately.
          </p>
        </div>
      )
    },
    {
      id: 'parking',
      category: 'location',
      question: 'Where do I park?',
      answer: (
        <div className="space-y-3">
          <p className="text-ink-60 font-semibold">🎉 Parking is completely free!</p>
          <div className="space-y-2">
            <div className="flex items-start">
              <MapPin className="w-4 h-4 text-accent-deep mt-1 mr-2 flex-shrink-0" />
              <span><strong>Parking Lot:</strong> Free spots directly in front of Merritt Workspace</span>
            </div>
            <div className="flex items-start">
              <MapPin className="w-4 h-4 text-accent-deep mt-1 mr-2 flex-shrink-0" />
              <span><strong>Street Parking:</strong> Free parking on both 23rd and Irving streets</span>
            </div>
          </div>
          <div className="bg-linen p-3 border border-clay">
            <p className="text-ink-60 text-sm"><strong>⚠️ Note:</strong> Be mindful of street cleaning days when parking on the street!</p>
          </div>
        </div>
      )
    },
    {
      id: 'conference-rooms',
      category: 'amenities',
      question: 'How do I book a conference room?',
      answer: (
        <div className="space-y-3">
          <p>Booking our first-class conference room is easy:</p>
          <div className="space-y-3">
            <div className="flex items-start">
              <Calendar className="w-4 h-4 text-accent-deep mt-1 mr-2 flex-shrink-0" />
              <span>Visit our <Link href="/member-resources/meeting-rooms" className="text-accent-deep hover:underline font-semibold">Conference Room page</Link> and click 'Book Now'</span>
            </div>
            <div className="bg-linen p-4 border border-clay">
              <h4 className="font-semibold text-ink-60 mb-2">📅 Member Benefits:</h4>
              <ul className="space-y-1 text-ink-60 text-sm">
                <li>• <strong>Included hours every month:</strong> 4 hours on a dedicated desk, 14&ndash;20 hours on a private office</li>
                <li>• Beyond your included hours: $25/hour, the same rate guests pay</li>
                <li>• Sessions run 1&ndash;4 hours; the room seats 8</li>
                <li>• Easy online booking system</li>
                <li>• 75&quot; display, fast WiFi, and A/V equipment</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'phone-calls',
      category: 'amenities',
      question: 'Where should I take Zoom calls and personal phone calls?',
      answer: (
        <div className="space-y-3">
          <p>We have several options for private calls:</p>
          <div className="space-y-3">
            <div className="bg-linen p-4 border border-clay">
              <h4 className="font-semibold text-ink-60 mb-2">📞 Phone Booth Options:</h4>
              <ul className="space-y-1 text-ink-60 text-sm">
                <li>• <strong>Five dedicated phone booths</strong> - first come, first served</li>
                <li>• No reservations required</li>
                <li>• Perfect for Zoom calls and personal calls</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p><strong>Alternative Options:</strong></p>
              <ul className="space-y-1 ml-4 text-sm">
                <li>• <strong>Event Space:</strong> Use if not occupied (available until 4:30 PM)</li>
                <li>• <strong>Outdoor Patio:</strong> Great spot for calls with fresh air</li>
                <li>• <strong>Private Office Members:</strong> Please close your door during calls</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'noise-policy',
      category: 'policies',
      question: 'What are your noise policies in the workspace?',
      answer: (
        <div className="space-y-3">
          <p>We maintain a productive, respectful environment for all members:</p>
          <div className="space-y-3">
            <div className="bg-linen p-4 border border-clay">
              <h4 className="font-semibold text-ink mb-2">🤫 Open Workspace Guidelines:</h4>
              <ul className="space-y-1 text-ink-60 text-sm">
                <li>• Keep conversations quiet and brief</li>
                <li>• Use phone booths for all calls</li>
                <li>• Take longer conversations to event space or outside</li>
                <li>• Be mindful of keyboard noise and notifications</li>
              </ul>
            </div>
            <div className="bg-linen p-4 border border-clay">
              <h4 className="font-semibold text-accent-deep mb-2">🚪 Private Office Members:</h4>
              <p className="text-accent-deep text-sm">Please close your door when taking calls or conducting meetings to respect the open workspace atmosphere.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'pets',
      category: 'policies',
      question: 'Can I bring my dog to the workspace?',
      answer: (
        <div className="space-y-3">
          <p>Our pet policy varies by membership type:</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-linen p-4 border border-clay">
              <h4 className="font-semibold text-ink-60 mb-2">✅ Private Office Members</h4>
              <ul className="space-y-1 text-ink-60 text-sm">
                <li>• Dogs are welcome!</li>
                <li>• Must stay in your private office</li>
                <li>• Please be respectful of other members</li>
              </ul>
            </div>
            <div className="bg-red-50 p-4 border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">❌ Dedicated Desks & Day Passes</h4>
              <p className="text-red-700 text-sm">Unfortunately, pets are not permitted in the shared workspace areas.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'snackshop',
      category: 'amenities',
      question: 'How do I buy snacks and coffee?',
      answer: (
        <div className="space-y-3">
          <p>Our convenient Snackshop makes it easy to fuel your workday:</p>
          <div className="space-y-3">
            <div className="flex items-start">
              <Coffee className="w-4 h-4 text-accent-deep mt-1 mr-2 flex-shrink-0" />
              <span>Visit our <Link href="/member-resources/snackshop" className="text-accent-deep hover:underline font-semibold">Snackshop page</Link> to browse and order</span>
            </div>
            <div className="bg-linen p-4 border border-clay">
              <h4 className="font-semibold text-accent-deep mb-2">🛒 How It Works:</h4>
              <ol className="space-y-1 text-accent-deep text-sm">
                <li>1. Browse our selection of drinks, snacks, and meals</li>
                <li>2. Add items to your cart</li>
                <li>3. Complete secure checkout</li>
                <li>4. Items delivered to your desk within 15 minutes</li>
              </ol>
            </div>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="bg-linen p-3 rounded border border-clay">
                <p className="text-ink-60"><strong>Payment Options:</strong> Credit card or account credit</p>
              </div>
              <div className="bg-linen p-3 rounded border border-clay">
                <p className="text-ink-60"><strong>Fresh Options:</strong> Coffee, healthy snacks, and meals</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'event-space',
      category: 'amenities',
      question: 'Can I use the Event Space next door?',
      answer: (
        <div className="space-y-3">
          <p>Yes! Our Event Space is available to all coworking members:</p>
          <div className="space-y-3">
            <div className="bg-linen p-4 border border-clay">
              <h4 className="font-semibold text-ink-60 mb-2">🎯 Event Space Features:</h4>
              <ul className="space-y-1 text-ink-60 text-sm">
                <li>• Coffee shop area with permanent seating</li>
                <li>• Professional projector and sound system</li>
                <li>• Ping pong table for breaks</li>
                <li>• Flexible meeting space</li>
              </ul>
            </div>
            <div className="bg-linen p-3 border border-clay">
              <p className="text-ink-60 text-sm"><strong>⏰ Availability:</strong> Open to coworking members daily until 4:30 PM (first come, first served)</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'wifi',
      category: 'technical',
      question: 'How fast is the WiFi?',
      answer: (
        <div className="space-y-3">
          <p>We provide enterprise-grade internet throughout the building:</p>
          <div className="space-y-3">
            <div className="bg-linen p-4 border border-clay">
              <h4 className="font-semibold text-ink-60 mb-2">🚀 WiFi Features:</h4>
              <ul className="space-y-1 text-ink-60 text-sm">
                <li>• High-speed fiber internet</li>
                <li>• Reliable connection throughout both buildings</li>
                <li>• Perfect for video calls and large file transfers</li>
                <li>• Backup connection for redundancy</li>
              </ul>
            </div>
            <p className="text-sm text-ink-60">Network details and passwords are provided during your member onboarding.</p>
          </div>
        </div>
      )
    },
    {
      id: 'security',
      category: 'policies',
      question: 'How secure is the building?',
      answer: (
        <div className="space-y-3">
          <p>Your safety and security are our top priorities:</p>
          <div className="space-y-3">
            <div className="bg-linen p-4 border border-clay">
              <h4 className="font-semibold text-ink-60 mb-2">🔒 Security Features:</h4>
              <ul className="space-y-1 text-ink-60 text-sm">
                <li>• 24/7 building monitoring</li>
                <li>• Unique access codes for each member</li>
                <li>• Individually locking private offices</li>
                <li>• Well-lit parking and entrance areas</li>
                <li>• Security cameras in common areas</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'cancellation-policy',
      category: 'membership',
      question: 'How do I cancel my membership? What is the cancellation policy?',
      answer: (
        <div className="space-y-4">
          <div className="bg-linen p-4 border border-clay">
            <h4 className="font-semibold text-accent-deep mb-2">Quick summary</h4>
            <ul className="space-y-1 text-accent-deep text-sm">
              <li>• At sign-up you pay your <strong>first month</strong> (prorated) and <strong>last month</strong> up front.</li>
              <li>• To cancel, you must give <strong>30 days&apos; written notice</strong>.</li>
              <li>• With proper notice, you <strong>are not billed</strong> for your final month — the last month&apos;s fee you already paid covers it.</li>
              <li>• Without proper 30 days&apos; notice, the last month&apos;s fee is <strong>forfeited</strong>.</li>
            </ul>
          </div>

          <div className="space-y-3 text-sm text-ink-60">
            <div>
              <p className="font-semibold text-ink mb-1">How to give notice</p>
              <p>
                Submit written notice in any of the following ways:
              </p>
              <ul className="ml-5 list-disc space-y-1 mt-1">
                <li>Click <strong>Cancel membership</strong> in your member portal (counts as written notice)</li>
                <li>Email <a href="mailto:memberservices@merrittworkspace.net" className="text-accent-deep hover:underline">memberservices@merrittworkspace.net</a></li>
                <li>Mail a letter to Merritt Workspace, 2246 Irving St., Denver, CO 80211</li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-ink mb-1">Final month billing</p>
              <p>
                Provided you give a full 30 days&apos; notice, you will <strong>not</strong> receive
                an invoice for your final month of membership. The Last Month&apos;s Membership Fee
                collected at sign-up is applied in full satisfaction of that final month.
              </p>
            </div>

            <div>
              <p className="font-semibold text-ink mb-1">Forfeiture for insufficient notice</p>
              <p>
                If you fail to provide a full 30 days&apos; written notice — including immediate
                cancellation, abandonment of the workspace, or any cancellation effective sooner
                than 30 days after we receive your notice — Merritt Workspace is entitled to
                retain the entire Last Month&apos;s Membership Fee as liquidated damages.
              </p>
            </div>

            <div>
              <p className="font-semibold text-ink mb-1">Inspection &amp; additional charges</p>
              <p>
                Beginning the day after we receive your cancellation notice and continuing through
                your last day of membership, Merritt Workspace is entitled to inspect the
                workspace and assess additional charges for any damage, excessive wear, missing
                items, or required restoration. All keys, access devices, and Merritt-provided
                equipment must be returned by your last day; keys not returned within 48 hours
                of your last day are subject to a $250 fee per item.
              </p>
            </div>

            <p className="text-xs text-ink-60">
              Full terms are in Section 4 of the{' '}
              <Link href="/terms" className="text-accent-deep hover:underline font-semibold">
                Terms &amp; Conditions
              </Link>
              .
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'contact',
      category: 'general',
      question: 'Who do I contact with additional questions?',
      answer: (
        <div className="space-y-3">
          <p>We're here to help! Reach out anytime:</p>
          <div className="space-y-3">
            <div className="bg-linen p-4 border border-clay">
              <h4 className="font-semibold text-accent-deep mb-3">📞 Contact Information:</h4>
              <div className="space-y-2 text-accent-deep">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  <a href="mailto:memberservices@merrittworkspace.net" className="hover:underline">
                    memberservices@merrittworkspace.net
                  </a>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2" />
                  <a href="tel:720-357-9499" className="hover:underline">
                    (720) 357-9499
                  </a>
                </div>
              </div>
            </div>
            <div className="text-sm text-ink-60">
              <p><strong>Response Time:</strong> We typically respond to emails within 4 hours during business days.</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const filteredFAQs = selectedCategory === 'all'
    ? faqData
    : faqData.filter(faq => faq.category === selectedCategory);

  return (
    <main className="bg-bone">
      <PageHero
        src="/images/amenities/kitchen-counter.webp"
        alt="A member working at the kitchen counter at Merritt Workspace in Sloan's Lake, Denver"
        blurDataURL={BLUR['amenities/kitchen-counter']}
        eyebrow="Answers"
        title={<>The questions people actually ask.</>}
        lead="Access, parking, pets, billing, WiFi, the flex space. If it isn't here, call us."
      />

      <section className="mw-section">
        <div className="mw-container">
          <div className="grid gap-12 md:grid-cols-12 md:gap-14">
            {/* Category filter — a sidebar on desktop, a scrolling row on phones. */}
            {/* min-w-0: a grid child defaults to min-width auto, which would let the
                scrolling filter row widen the page instead of scrolling. */}
            <aside className="min-w-0 md:col-span-3">
              <p className="mw-eyebrow mb-5">Browse</p>
              <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 md:mx-0 md:flex-col md:gap-0 md:overflow-visible md:px-0 md:pb-0">
                {CATEGORIES.map(category => {
                  const active = selectedCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      aria-pressed={active}
                      className={`min-h-[44px] whitespace-nowrap border-b-2 px-3 text-left text-[15px] transition md:whitespace-normal md:border-b md:border-l-2 md:border-b-clay md:px-0 md:py-3 md:pl-4 ${
                        active
                          ? 'border-accent font-medium text-ink md:border-l-accent'
                          : 'border-transparent text-ink-60 hover:text-ink md:border-l-transparent'
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Questions */}
            <div className="min-w-0 md:col-span-8 md:col-start-5">
              <div className="border-t border-clay">
                {filteredFAQs.map((faq) => {
                  const isOpen = openItems.includes(faq.id);
                  return (
                    <div key={faq.id} className="border-b border-clay">
                      <button
                        onClick={() => toggleItem(faq.id)}
                        aria-expanded={isOpen}
                        className="flex min-h-[44px] w-full items-start justify-between gap-6 py-6 text-left transition hover:opacity-70"
                      >
                        <h3 className="font-display text-xl font-semibold leading-snug tracking-tight text-ink md:text-2xl">
                          {faq.question}
                        </h3>
                        <span
                          aria-hidden="true"
                          className={`mt-1.5 shrink-0 text-2xl font-light leading-none text-ink-60 transition-transform duration-200 ${
                            isOpen ? 'rotate-45' : ''
                          }`}
                        >
                          +
                        </span>
                      </button>

                      {isOpen && (
                        <div className="mw-legal max-w-2xl pb-7 text-[16px] leading-relaxed text-ink-60">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {filteredFAQs.length === 0 && (
                <p className="py-12 mw-body">No questions in this category yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Still have questions */}
      <section className="border-t border-clay bg-ink py-20 text-bone md:py-32">
        <div className="mw-container">
          <div className="max-w-3xl">
            <p className="mb-5 text-[12px] font-medium uppercase tracking-[0.18em] text-bone/60 md:text-[13px]">
              Still stuck
            </p>
            <h2 className="font-display text-[2rem] font-semibold leading-[1.02] tracking-tightest text-bone sm:text-4xl lg:text-[3.25rem]">
              Ask us directly.
            </h2>
            <p className="mt-7 max-w-2xl text-[17px] leading-relaxed text-bone/70 md:text-lg">
              Someone is on the other end of both of these. Email gets you a
              considered answer; the phone gets you a fast one.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <a
                href="mailto:memberservices@merrittworkspace.net"
                className="mw-btn bg-accent text-white hover:bg-accent-deep"
              >
                Email member services
              </a>
              <a
                href="tel:720-357-9499"
                className="mw-btn border border-bone/40 text-bone hover:bg-bone hover:text-ink"
              >
                Call (720) 357-9499
              </a>
            </div>
            <p className="mt-8 text-[15px] text-bone/60">
              Not a member yet?{' '}
              <Link href="/membership" className="border-b border-accent pb-0.5 text-bone hover:border-bone">
                See membership options
              </Link>.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
