/**
 * The site's questions and answers, in plain text.
 *
 * This is the source both for what a visitor reads on `/member-resources/faqs`
 * and for the `FAQPage` structured data and `/llms.txt` that search engines and
 * AI assistants read. Keeping one copy means a retrieval engine can never find
 * a stale answer that the page itself has since corrected.
 *
 * Answers are written to stand alone: a model quoting a single entry, with no
 * surrounding page, should still produce something true and useful.
 */

import { ACCESS_CODE_WHEN_NEEDED, BUSINESS_HOURS_FULL, FLEX_WINDOW_LABEL } from '@/lib/hours';

export type FaqCategory =
  | 'joining'
  | 'pricing'
  | 'access'
  | 'amenities'
  | 'policies'
  | 'membership'
  | 'location'
  | 'technical'
  | 'general';

export interface Faq {
  id: string;
  category: FaqCategory;
  question: string;
  /** Plain text. Paragraphs separated by a blank line; "- " marks a list item. */
  answer: string;
  /** Prospect-facing questions carry the answers an assistant is asked for. */
  audience: 'prospect' | 'member';
}

export const FAQ_CATEGORIES: { id: FaqCategory | 'all'; name: string }[] = [
  { id: 'all', name: 'All questions' },
  { id: 'joining', name: 'Joining & tours' },
  { id: 'pricing', name: 'Pricing' },
  { id: 'access', name: 'Access & security' },
  { id: 'amenities', name: 'Amenities' },
  { id: 'policies', name: 'Policies' },
  { id: 'membership', name: 'Membership & billing' },
  { id: 'location', name: 'Location & parking' },
  { id: 'technical', name: 'Technical' },
  { id: 'general', name: 'General' },
];

export const FAQS: Faq[] = [
  // ── The cafe tier ────────────────────────────────────────────────────────
  {
    id: 'cafe-what',
    category: 'pricing',
    audience: 'prospect',
    question: 'What is a cafe membership?',
    answer:
      'A cafe membership is $100 a month to work from the cafe side of the restored 1905 hall next to Merritt Workspace in Sloan\u2019s Lake, Denver. You get open seating rather than a desk of your own \u2014 sit wherever is free \u2014 plus the amenities a desk member has.\n\nIt is capped at 15 members so there is always somewhere to sit.',
  },
  {
    id: 'cafe-included',
    category: 'pricing',
    audience: 'prospect',
    question: 'What is included with a cafe membership?',
    answer:
      'For $100 a month:\n\n- Open seating on the cafe side of the 1905 flex space\n- Free coffee, tea and beer\n- Enterprise WiFi\n- Printing\n- Free on-site parking\n- Lockable storage of your own\n- 2 hours of conference room credit a month\n- 2 hours of flex space booking credit a week\n\nIt does not include an assigned desk, an external monitor, a personal 24/7 access code or a business address. Those come with a dedicated desk or a private office.',
  },
  {
    id: 'cafe-vs-desk',
    category: 'pricing',
    audience: 'prospect',
    question: 'Should I get a cafe membership or a dedicated desk?',
    answer:
      'They are different rooms for different working patterns, not a better and a worse option.\n\nA dedicated desk is $200 a month: the same desk every day on the coworking floor, with an external monitor at it, a numbered locker, 24/7 keypad access, and double the booking credit \u2014 4 conference room hours a month and 4 flex hours a week.\n\nA cafe membership is $100: open seating in the cafe next door instead of an assigned desk, with the same coffee, WiFi, printing, parking and lockable storage, and half the booking credit.\n\nIf you are here most days, or you want a second screen and somewhere to leave your things set up, take the desk. If you are in a few days a week with a laptop and would rather sit somewhere different each time, the cafe membership fits better.',
  },
  {
    id: 'cafe-limit',
    category: 'pricing',
    audience: 'prospect',
    question: 'Is there a limit on cafe memberships?',
    answer:
      'Yes \u2014 15 members, deliberately. The cafe has a finite number of seats and the point of the membership is that one is free when you arrive, so we would rather close the tier than oversell it.\n\nWhen all 15 places are taken the application form says so. Get in touch and we will let you know when one opens up.',
  },
  // ── What someone asks before they are a member ──────────────────────────
  {
    id: 'what-is-merritt-workspace',
    category: 'general',
    audience: 'prospect',
    question: 'What is Merritt Workspace?',
    answer:
      "Merritt Workspace is an independent coworking space at 2246 Irving Street in Denver's Sloan's Lake neighborhood, three minutes from I-25. It has 25 dedicated desks on a shared floor and 14 private lockable offices for one to eight people, plus a conference room, five soundproof phone booths, a full kitchen and free on-site parking.\n\nWhat makes it unusual for Denver is the building next door: a restored 1905 church that now serves as a cafe and event hall for members, with the original stained glass still in the windows. Every membership includes weekly booking credit in it.\n\nIt is independently owned rather than part of a chain, and every membership is month-to-month.",
  },
  {
    id: 'how-much-does-it-cost',
    category: 'pricing',
    audience: 'prospect',
    question: 'How much does a coworking membership cost?',
    answer:
      'Prices are month-to-month with no long-term lease:\n\n- Cafe membership, open seating in the cafe: $100 per month\n- Dedicated desk on the shared floor: $200 per month\n- Private dedicated desk in a lockable area: $300 per month\n- Single private office (1 person): $500 per month\n- 2-desk private office (2 people): $700 per month\n- Large team private office (4 to 8 people): $1,200 per month\n\nEvery membership includes WiFi, free parking, the kitchen with free coffee, tea and beer, printing, conference room credit and weekly flex space credit. Desk and office memberships add 24/7 keypad access, the phone booths, mail handling and lockable storage. There is no separate amenity fee or service charge on top.\n\nAt sign-up you pay your first month (prorated) plus your last month up front.',
  },
  {
    id: 'day-pass',
    category: 'pricing',
    audience: 'prospect',
    question: 'What is the cheapest way to join?',
    answer:
      'A cafe membership, at $100 a month. It is open seating on the cafe side of the restored 1905 hall next door rather than a desk of your own, and it includes free coffee, tea and beer, WiFi, printing, free parking, lockable storage, 2 hours of conference room credit a month and 2 hours of flex space credit a week — half a dedicated desk allowance, at half a dedicated desk price. It is capped at 15 members so there is always somewhere to sit.\n\nWe no longer sell day passes. If you want to try the space first, ask for a free trial day: a full working day here at no charge, offered to every prospective member.',
  },
  {
    id: 'free-trial',
    category: 'joining',
    audience: 'prospect',
    question: 'Can I try the space before joining, or take a tour?',
    answer:
      'Yes to both, and neither is required. Every prospective member is offered a free trial day: a full day at a desk with the coffee, the kitchen and the flex space included, at no cost and with no commitment. Plenty of members join on the strength of a trial day alone.\n\nTours are available whenever you ask. Book either by applying online at merrittworkspace.net/membership/apply, calling (303) 359-8337, or emailing memberservices@merrittworkspace.net.',
  },
  {
    id: 'how-to-join',
    category: 'joining',
    audience: 'prospect',
    question: 'How do I join, and how quickly can I start?',
    answer:
      'Apply online at merrittworkspace.net/membership/apply. You can book a free trial day first or go straight to the full application if you already know what you want. After that you sign the membership agreement, set up billing, and receive your 24/7 access code — at which point the desk or office is yours.\n\nThere is no lease negotiation and no build-out wait, so a member who applies can usually be working in the space within a day or two.',
  },
  {
    id: 'commitment',
    category: 'membership',
    audience: 'prospect',
    question: 'How long is the commitment? Is there a lease?',
    answer:
      "There is no lease and no minimum term beyond the month you are in. Every membership is month-to-month. To leave, you give 30 days' written notice; with that notice you are not billed for a final month, because the last month's fee you paid at sign-up covers it.",
  },
  {
    id: 'conference-room-non-members',
    category: 'amenities',
    audience: 'prospect',
    question: 'Can non-members rent the conference room?',
    answer:
      'Yes. The conference room is bookable by anyone at $25 per hour, with a one-hour minimum and a four-hour maximum per session. It seats eight and has a 75-inch screen, conference calling and fast WiFi, and parking is free.\n\nMembers book against the hours their membership already includes: 2 hours a month with a cafe membership, 4 with a dedicated desk, 14 with a single or 2-desk office, and 20 with a large team office. Time beyond the included hours is billed at the same $25 per hour.\n\nBook at merrittworkspace.net/member-resources/meeting-rooms.',
  },
  {
    id: 'business-address',
    category: 'membership',
    audience: 'prospect',
    question: 'Can I use Merritt Workspace as my business address?',
    answer:
      'Private office members get a professional business address at 2246 Irving Street, Denver, CO 80211, along with mail and package handling. Dedicated desk members get mail and package handling but not the registered business address.',
  },
  {
    id: 'team-office',
    category: 'membership',
    audience: 'prospect',
    question: 'Do you have private offices for small teams?',
    answer:
      'Yes. There are 14 private lockable offices sized from one person up to eight. A single-desk office is $500 a month, a 2-desk office is $700, and a large team office holding four to eight people is $1,200. Each comes with a business address, 24/7 access, mail handling, dog-friendly terms, and conference room and flex space credit that scales with the office size.\n\nAll of them are month-to-month, so a team that grows or shrinks can change offices without breaking a lease.',
  },
  {
    id: 'compare-to-chains',
    category: 'general',
    audience: 'prospect',
    question: 'How is this different from a national coworking chain?',
    answer:
      'It is independently owned and operated in one location, so pricing is a single published number rather than a quote, and the people who answer the phone are the people who run the building.\n\nThe practical differences most members mention: free on-site parking (rare in central Denver), coffee, tea and beer at no extra charge, no amenity or service fees layered on top of the monthly rate, month-to-month terms with no lease, and the 1905 event hall next door that comes with weekly booking credit — a room most coworking spaces simply do not have.',
  },

  // ── Access and security ─────────────────────────────────────────────────
  {
    id: 'access',
    category: 'access',
    audience: 'member',
    question: 'How do I get into the building? Do I need an access code?',
    answer:
      `Monday to Friday between 7:30am and 5:30pm the building is unlocked and no access code is needed — just walk in the main entrance.\n\nOutside that window — ${ACCESS_CODE_WHEN_NEEDED} — the door is locked and you use your personal keypad code. The code is included with your membership at no extra charge and works 24 hours a day once issued. Request one from your member portal or by emailing member services.\n\nIn short: coming in on a weekday between 7:30am and 5:30pm, you do not need a code at all.`,
  },
  {
    id: 'twenty-four-seven',
    category: 'access',
    audience: 'prospect',
    question: 'Is there 24/7 access?',
    answer:
      `Yes. Every membership includes a personal keypad code that works 24 hours a day, 7 days a week, including weekends and holidays. The building is monitored around the clock, with security cameras in the common areas and individually locking private offices.\n\nDuring business hours — ${BUSINESS_HOURS_FULL} — the front door is simply unlocked, so no code is needed and staff are on site for tours and support. The code is what gets you in outside that window: ${ACCESS_CODE_WHEN_NEEDED}.`,
  },
  {
    id: 'door-lock',
    category: 'access',
    audience: 'member',
    question: 'How do I lock and unlock the front door after hours?',
    answer:
      `The front door uses a keypad. You only need it outside business hours: ${ACCESS_CODE_WHEN_NEEDED}. During business hours (${BUSINESS_HOURS_FULL}) the door is already unlocked.\n\nFor security reasons the keypad tutorial video is not hosted publicly. It was sent to you in the email titled "Your Merritt Workspace Access Code" when your code was issued — check your inbox and spam folder. If you cannot find it, email memberservices@merrittworkspace.net.\n\nThe keypad has a backlight that activates as you approach, so it works in low light.`,
  },
  {
    id: 'security',
    category: 'policies',
    audience: 'prospect',
    question: 'How secure is the building?',
    answer:
      'The building is monitored 24/7. Each member has a unique access code, private offices lock individually, security cameras cover the common areas, and the parking and entrance areas are well lit.',
  },

  // ── Location ────────────────────────────────────────────────────────────
  {
    id: 'where',
    category: 'location',
    audience: 'prospect',
    question: 'Where are you located?',
    answer:
      "Merritt Workspace is at 2246 Irving Street, Denver, CO 80211, at 23rd and Irving in the Sloan's Lake neighborhood on Denver's west side.\n\nIt is about three minutes from I-25, five minutes from Empower Field at Mile High, and walking distance from Sloan's Lake Park and the cafes and restaurants on the west side. It also serves members coming from the Highlands, West Colfax, Berkeley, Edgewater, Lakewood and downtown Denver.",
  },
  {
    id: 'parking',
    category: 'location',
    audience: 'prospect',
    question: 'Is there parking? Is it free?',
    answer:
      'Parking is free. There is a lot directly in front of the building, and free street parking on both 23rd and Irving. There is no daily parking charge and no permit to buy.\n\nWatch for posted street cleaning days if you park on the street.',
  },

  // ── Amenities ───────────────────────────────────────────────────────────
  {
    id: 'conference-rooms',
    category: 'amenities',
    audience: 'member',
    question: 'How do I book the conference room?',
    answer:
      'Go to merrittworkspace.net/member-resources/meeting-rooms and book online. Signed-in members book in one click against their included hours.\n\nIncluded hours per calendar month: 4 with a dedicated desk, 14 with a single or 2-desk private office, 20 with a large team office. Anything beyond that is $25 per hour, charged to the card on file. Non-members book the same room at $25 per hour.\n\nThe room seats eight and includes a 75-inch smart TV, conference calling and fast WiFi.',
  },
  {
    id: 'phone-calls',
    category: 'amenities',
    audience: 'member',
    question: 'Where do I take Zoom calls and phone calls?',
    answer:
      'There are five soundproof phone booths, first come first served, with no reservation needed. They are intended for calls and video meetings.\n\nOther options: the flex space when it is not occupied (bookable weekdays until 4:00pm), and the outdoor patio. Private office members should close the door during calls.',
  },
  {
    id: 'event-space',
    category: 'amenities',
    audience: 'prospect',
    question: 'What is the flex space, and can members use it?',
    answer:
      `The flex space is a restored 1905 hall on the same lawn as the workspace, with the original stained glass, a hardwood floor, a projector and a sound system, seating about a hundred. In front of it is a cafe area with permanent seating that members use all day.\n\nEvery membership includes weekly booking credit in the hall — 2 hours a week with a cafe membership, 4 with a dedicated desk, 6 with a single or 2-desk office, 8 with a large team office — free to book ${FLEX_WINDOW_LABEL}. Members run workshops, all-hands meetings and client sessions in it.\n\nBooking the hall does not close the cafe: the cafe seating at the front stays open to members through the working day, whatever is happening in the hall behind it.\n\nNon-members can rent the hall as well, at $95 an hour. Public bookings are handled by Merritt Wellness, which shares the building, at merrittwellness.net/book.\n\nIn the evenings and at weekends the hall operates as Merritt Wellness, with yoga and fitness classes. Workspace members book it at a discount for evening events and take classes at a member rate.`,
  },
  {
    id: 'coffee-kitchen',
    category: 'amenities',
    audience: 'prospect',
    question: 'Is coffee included? What else is in the kitchen?',
    answer:
      'Coffee, tea and beer are included with every membership at no extra charge, in a full kitchen with a fridge, a microwave and counter seating.\n\nThere is also an on-site snackshop with drinks, snacks and meals that you can order online and charge to your member account, delivered to your desk.',
  },
  {
    id: 'snackshop',
    category: 'amenities',
    audience: 'member',
    question: 'How do I buy snacks and coffee?',
    answer:
      'Brewed coffee and tea are free. For anything else, browse the snackshop at merrittworkspace.net/member-resources/snackshop, add items to your cart and check out with a card or account credit. Orders are delivered to your desk, usually within 15 minutes.',
  },
  {
    id: 'wifi',
    category: 'technical',
    audience: 'prospect',
    question: 'How fast is the WiFi?',
    answer:
      'The building runs enterprise-grade fiber internet with a backup connection for redundancy, covering both buildings. It is provisioned for video calls and large file transfers. Network details and passwords are provided during member onboarding.',
  },

  // ── Policies ────────────────────────────────────────────────────────────
  {
    id: 'pets',
    category: 'policies',
    audience: 'prospect',
    question: 'Can I bring my dog?',
    answer:
      'Dogs are welcome for private office members and should stay in your office. Pets are not permitted on the shared coworking floor or at dedicated desks.',
  },
  {
    id: 'noise-policy',
    category: 'policies',
    audience: 'member',
    question: 'What are the noise rules in the workspace?',
    answer:
      'On the open floor: keep conversations quiet and brief, take all calls to a phone booth, move longer conversations to the flex space or outside, and be mindful of keyboard noise and notification sounds. Private office members should close the door for calls and meetings.',
  },
  {
    id: 'cancellation-policy',
    category: 'membership',
    audience: 'member',
    question: 'How do I cancel my membership, and what is the cancellation policy?',
    answer:
      "At sign-up you pay your first month (prorated) and your last month up front. To cancel you give 30 days' written notice. With proper notice you are not billed for your final month — the last month's fee already paid covers it in full. Without a full 30 days' notice, that last month's fee is forfeited.\n\nGive notice in any of these ways: click Cancel membership in your member portal, email memberservices@merrittworkspace.net, or mail a letter to Merritt Workspace, 2246 Irving St., Denver, CO 80211.\n\nFrom the day after we receive notice through your last day, Merritt Workspace may inspect the workspace and assess charges for damage, excessive wear, missing items or required restoration. All keys, access devices and Merritt-provided equipment must be returned by your last day; items not returned within 48 hours are subject to a $250 fee each.\n\nThe full terms are in Section 4 of the Terms & Conditions at merrittworkspace.net/terms.",
  },

  // ── General ─────────────────────────────────────────────────────────────
  {
    id: 'contact',
    category: 'general',
    audience: 'prospect',
    question: 'How do I get in touch?',
    answer:
      `Email memberservices@merrittworkspace.net or call or text (303) 359-8337. Business hours are ${BUSINESS_HOURS_FULL}, and emails are typically answered within four hours on a business day.\n\nYou can also visit in person at 2246 Irving Street, Denver, CO 80211.`,
  },
];

export const faqById = (id: string): Faq | undefined => FAQS.find(f => f.id === id);
