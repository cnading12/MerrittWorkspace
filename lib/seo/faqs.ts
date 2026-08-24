/**
 * Plain-text mirror of the questions on /member-resources/faqs, for FAQPage
 * structured data.
 *
 * The page itself renders JSX answers — icons, panels, links — which cannot go
 * into JSON-LD, and Google requires the marked-up answer to match what a
 * visitor actually reads. So the answers here are prose restatements of the
 * same facts, not a second set of facts.
 *
 * `__tests__/seo-schema.test.ts` reads the page source and fails if the two
 * question lists ever diverge, so a question added to the page without a
 * matching entry here is caught before it ships.
 */

import {
  ACCESS_CODE_WHEN_NEEDED,
  BUSINESS_HOURS_FULL,
  BUSINESS_HOURS_LABEL,
  FLEX_HOURS_LABEL,
} from '../hours';
import type { Faq } from './schema';

export const FAQS: Faq[] = [
  {
    question: 'How do I get access to the building? Do I need an access code?',
    answer:
      `During business hours — ${BUSINESS_HOURS_FULL} — the building is unlocked and you can walk straight in through the main entrance. No access code is needed. You only need a personal access code ${ACCESS_CODE_WHEN_NEEDED}, when the door is locked. That code is included with your membership at no extra charge; request one from your member portal or email member services if you plan to come in outside business hours.`,
  },
  {
    question: 'How do I lock and unlock the front door after hours?',
    answer:
      `The front door uses a keypad. You only need it ${ACCESS_CODE_WHEN_NEEDED}; during business hours (${BUSINESS_HOURS_FULL}) the door is unlocked and no code is required. Your unique access code is available on request once your membership starts, works 24 hours a day, and is personal to you. The keypad backlights as you approach, so it is easy to use in the dark. For security the keypad tutorial video is not hosted publicly; it was sent in the email titled "Your Merritt Workspace Access Code" when your code was issued. If you cannot find it, email memberservices@merrittworkspace.net.`,
  },
  {
    question: 'Where do I park?',
    answer:
      'Parking is completely free. There are free spots in the lot directly in front of Merritt Workspace, and free street parking on both 23rd and Irving. Just be mindful of posted street cleaning days if you park on the street.',
  },
  {
    question: 'How do I book a conference room?',
    answer:
      'Book from the Conference Room page at merrittworkspace.net/member-resources/meeting-rooms. Every membership includes conference room hours each month — 2 hours on a café membership, 4 on a dedicated desk and 14 to 20 on a private office. Time beyond your included hours is billed at $25 an hour, the same rate guests and non-members pay. Sessions run from one to four hours, and the room seats eight with a 75-inch display, fast WiFi and A/V.',
  },
  {
    question: 'Where should I take Zoom calls and personal phone calls?',
    answer:
      `There are five soundproof phone booths, first come first served, with no reservation needed — they are built for Zoom and phone calls. You can also use the event space next door when it is not booked, which is open to members on weekdays, ${FLEX_HOURS_LABEL}, or the outdoor patio. Private office members are asked to close their door during calls.`,
  },
  {
    question: 'What are your noise policies in the workspace?',
    answer:
      'In the open workspace, keep conversations quiet and brief, use the phone booths for all calls, take longer conversations to the event space or outside, and be mindful of keyboard noise and notifications. Private office members should close their door when taking calls or holding meetings.',
  },
  {
    question: 'Can I bring my dog to the workspace?',
    answer:
      'Dogs are welcome for private office members, provided they stay in your private office and you are respectful of other members. Pets are not permitted in the shared workspace or the café, so dedicated desk and café memberships are not dog-friendly.',
  },
  {
    question: 'How do I buy snacks and coffee?',
    answer:
      'Coffee, tea and beer are free and always available in the kitchen. For everything else, the Snackshop page at merrittworkspace.net/member-resources/snackshop lists drinks, snacks and quick meals: browse, add to your cart, check out with a credit card or account credit, and your order is delivered to your desk within about 15 minutes.',
  },
  {
    question: 'Can I use the Event Space next door?',
    answer:
      `Yes. The restored 1905 building next door is open to all coworking members on weekdays, ${FLEX_HOURS_LABEL}, first come first served. It has a café area with permanent seating, a projector and sound system, a ping pong table, and flexible meeting space. Memberships also include weekly flex space booking credit — 2 hours a week on a café membership, 4 on a dedicated desk, 6 to 8 on a private office.`,
  },
  {
    question: 'How fast is the WiFi?',
    answer:
      'The buildings run on high-speed fiber internet with a backup connection for redundancy, reaching throughout both buildings and built for video calls and large file transfers. Network details and passwords are provided during member onboarding.',
  },
  {
    question: 'How secure is the building?',
    answer:
      'The building is monitored 24 hours a day, every member gets a unique access code, private offices lock individually, security cameras cover the common areas, and the parking and entrance areas are well lit.',
  },
  {
    question: 'How do I cancel my membership? What is the cancellation policy?',
    answer:
      'At sign-up you pay your first month (prorated) and your last month up front. To cancel, give 30 days written notice — click "Cancel membership" in your member portal, email memberservices@merrittworkspace.net, or mail a letter to Merritt Workspace, 2246 Irving St., Denver, CO 80211. With a full 30 days notice you are not invoiced for your final month; the last month fee collected at sign-up covers it. Without a full 30 days notice, that last month fee is forfeited as liquidated damages. All keys, access devices and Merritt-provided equipment must be returned by your last day; items not returned within 48 hours are subject to a $250 fee each. Full terms are in Section 4 of the Terms & Conditions.',
  },
  {
    question: 'Who do I contact with additional questions?',
    answer:
      'Email memberservices@merrittworkspace.net or call (720) 357-9499. We typically respond to email within 4 hours on business days.',
  },
];

/**
 * Answers to the questions someone weighing up a cafe membership actually has.
 *
 * Rendered visibly on /membership/cafe *and* emitted as FAQPage markup from its
 * layout, both off this one array. Google requires the marked-up answer to be
 * the answer a visitor can read on the page, so the two must not be allowed to
 * drift — sharing the source is the only way to guarantee that.
 */
export const CAFE_FAQS: Faq[] = [
  {
    question: 'What is a café membership?',
    answer:
      "It is a $100 a month membership to work from the café side of the restored 1905 building next to Merritt Workspace in Sloan's Lake, Denver. You get open seating rather than a desk of your own — sit wherever is free — plus every amenity a desk member has. It is capped at 15 members so there is always somewhere to sit.",
  },
  {
    question: "What is included with a $100 café membership?",
    answer:
      "Free coffee, tea and beer, high-speed WiFi, printing, free on-site parking, and the kitchen. You also get 2 hours of conference room credit a month and 2 hours of flex space booking credit a week — half what a dedicated desk membership includes, at half the price.",
  },
  {
    question: 'How is it different from a dedicated desk?',
    answer:
      "A dedicated desk is $200 a month and gives you the same desk every day on the coworking floor, with a locker, 24/7 access by code, and double the booking credit. A café membership is $100, gives you open seating in the café instead of an assigned desk, and includes half the conference room and flex space hours. If you are in most days and want somewhere to leave a monitor, take the desk; if you are in a few days a week with a laptop, the café membership is the better deal.",
  },
  {
    question: 'Is there a limit on café memberships?',
    answer:
      'Yes — 15 members, deliberately. The café has a finite number of seats and the whole point of the membership is that one is free when you arrive, so we would rather close the tier than oversell it. When all 15 places are taken, get in touch and we will let you know when one opens up.',
  },
]
