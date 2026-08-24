/**
 * Canonical facts about Merritt Workspace.
 *
 * Everything that answers "what is this place, where is it, what does it cost"
 * lives here once. Schema.org JSON-LD, `/llms.txt`, and the FAQ page all read
 * from this module rather than restating the numbers, because an answer engine
 * that finds two different prices on one site tends to quote neither.
 *
 * When a real-world fact changes — a price, the hours, the phone number —
 * change it here and every machine-readable surface follows.
 */

export const SITE_URL = 'https://merrittworkspace.net';

export const BUSINESS = {
  name: 'Merritt Workspace',
  alternateName: 'Merritt Workspace Coworking',
  url: SITE_URL,
  founded: '2023',
  buildingYear: '1905',
  slogan: 'Where Work Meets Community',

  /** One paragraph. This is the sentence an assistant is most likely to quote. */
  summary:
    'Merritt Workspace is an independent coworking space at 2246 Irving Street in the ' +
    "Sloan's Lake neighborhood of Denver, Colorado. It offers dedicated desks from $200 a " +
    'month and private lockable offices from $500 a month, all month-to-month with no ' +
    'long-term lease. Members get 24/7 keypad access, free on-site parking, enterprise ' +
    'WiFi, five soundproof phone booths, a conference room, a full kitchen with free ' +
    'coffee, tea and beer, and booking credit in a restored 1905 event hall on the same ' +
    'lawn. It is three minutes from I-25 and a short walk from Sloan’s Lake Park.',

  address: {
    street: '2246 Irving Street',
    locality: 'Denver',
    region: 'CO',
    regionName: 'Colorado',
    postalCode: '80211',
    country: 'US',
    /** Single-line form, used verbatim everywhere an address is printed. */
    full: '2246 Irving Street, Denver, CO 80211',
  },

  geo: { latitude: 39.75098609588881, longitude: -105.03225422342487 },

  neighborhood: "Sloan's Lake",
  crossStreets: '23rd and Irving',

  telephone: '+1-720-357-9499',
  telephoneDisplay: '(720) 357-9499',
  telephoneHref: 'tel:+17203579499',
  email: 'memberservices@merrittworkspace.net',

  mapUrl: 'https://www.google.com/maps?cid=10105178442159244045',

  /**
   * Three different clocks, and prospects conflate them constantly. Named
   * separately so a machine reader can keep them apart.
   */
  hours: {
    memberAccess: '24 hours a day, 7 days a week, for members with an access code',
    buildingUnlocked: 'Monday to Friday, 8:00am to 6:00pm (no access code needed)',
    staffed: 'Monday to Friday, 9:00am to 5:00pm (staffed for tours and support)',
  },

  parking: 'Free. A private lot directly in front of the building, plus free street parking on 23rd and Irving.',

  gettingHere: [
    'Three minutes from I-25',
    'Five minutes from Empower Field at Mile High',
    "Walking distance to Sloan's Lake Park and the cafes and restaurants on the west side",
  ],

  capacity: { desks: 25, privateOffices: 14, phoneBooths: 5 },

  socialProfiles: [
    'https://www.instagram.com/themerritthouse/',
    'https://www.facebook.com/profile.php?id=61577369304992',
    'https://www.google.com/maps?cid=10105178442159244045',
    'https://www.merrittwellness.net',
  ],
} as const;

/** What "yes we have that" means here, in the words people search with. */
export const AMENITIES = [
  '24/7 access with a personal keypad code',
  'Free on-site parking and free street parking',
  'Enterprise fiber WiFi with a backup connection',
  'Conference room seating 8, with a 75-inch screen and conference calling',
  'Five soundproof phone booths for calls and video meetings',
  'Restored 1905 event hall and cafe seating next door',
  'Full kitchen with free coffee, tea and beer',
  'On-site snackshop billable to your member account',
  'Mail and package handling',
  'Professional business address (private offices)',
  'Numbered lockable storage',
  'Printing',
  'Dog-friendly private offices',
  'Monitored building with security cameras in common areas',
  'Community and networking events',
] as const;

export interface Plan {
  id: string;
  name: string;
  /** Price in whole US dollars. */
  price: number;
  /** 'month' for recurring memberships, 'day' for the day pass. */
  unit: 'month' | 'day';
  capacity: string;
  privacy: string;
  url: string;
  summary: string;
  /** Hours of conference room credit per calendar month; null for the day pass. */
  meetingCreditPerMonth: number | null;
  /** Hours of flex-space credit per week; null when not included. */
  flexCreditPerWeek: number | null;
  businessAddress: boolean;
  dogsAllowed: boolean;
  bestFor: string;
}

export const PLANS: Plan[] = [
  {
    id: 'dedicated_desk',
    name: 'Dedicated Desk',
    price: 200,
    unit: 'month',
    capacity: '1 person',
    privacy: 'Shared coworking floor',
    url: `${SITE_URL}/membership/dedicated-desk`,
    summary:
      'The same desk every day on the shared coworking floor, with a numbered locker, ' +
      '24/7 access, enterprise WiFi and free coffee, tea and beer.',
    meetingCreditPerMonth: 4,
    flexCreditPerWeek: 4,
    businessAddress: false,
    dogsAllowed: false,
    bestFor: 'Freelancers, consultants and remote workers',
  },
  {
    id: 'private_dedicated_desk',
    name: 'Private Dedicated Desk',
    price: 300,
    unit: 'month',
    capacity: '1 person',
    privacy: 'Private lockable area, off the shared floor',
    url: `${SITE_URL}/membership/dedicated-desk`,
    summary:
      'A dedicated desk inside a private, lockable office area rather than on the open ' +
      'floor. Same amenities as the dedicated desk, plus a door.',
    meetingCreditPerMonth: 4,
    flexCreditPerWeek: 4,
    businessAddress: false,
    dogsAllowed: false,
    bestFor: 'Members who want a dedicated desk with real privacy',
  },
  {
    id: 'one_day_dedicated_desk',
    name: 'Day Pass',
    price: 30,
    unit: 'day',
    capacity: '1 person',
    privacy: 'Shared coworking floor',
    url: `${SITE_URL}/membership/apply`,
    summary:
      'A single day at a dedicated desk, including one hour of conference room time, ' +
      'WiFi, printing and the kitchen. Flex space is not included with day passes.',
    meetingCreditPerMonth: null,
    flexCreditPerWeek: null,
    businessAddress: false,
    dogsAllowed: false,
    bestFor: 'Travellers and drop-ins',
  },
  {
    id: 'private_office_single',
    name: 'Single Desk Private Office',
    price: 500,
    unit: 'month',
    capacity: '1 person',
    privacy: 'Private lockable office',
    url: `${SITE_URL}/membership/private-office`,
    summary:
      'A lockable office of your own with a professional business address, 24/7 access ' +
      'and priority phone booth access.',
    meetingCreditPerMonth: 14,
    flexCreditPerWeek: 6,
    businessAddress: true,
    dogsAllowed: true,
    bestFor: 'Solo professionals who need a door that closes',
  },
  {
    id: 'private_office_double',
    name: '2-Desk Private Office',
    price: 700,
    unit: 'month',
    capacity: '2 people',
    privacy: 'Private lockable office',
    url: `${SITE_URL}/membership/private-office`,
    summary:
      'A lockable two-desk office with a business address, mail handling and priority ' +
      'event space access.',
    meetingCreditPerMonth: 14,
    flexCreditPerWeek: 6,
    businessAddress: true,
    dogsAllowed: true,
    bestFor: 'Partnerships and two-person teams',
  },
  {
    id: 'private_office_large',
    name: 'Large Team Private Office',
    price: 1200,
    unit: 'month',
    capacity: '4 to 8 people',
    privacy: 'Private lockable office',
    url: `${SITE_URL}/membership/private-office`,
    summary:
      'A large private office for a team of four to eight, with monthly snackshop ' +
      'credit, priority event space booking and a business address.',
    meetingCreditPerMonth: 20,
    flexCreditPerWeek: 8,
    businessAddress: true,
    dogsAllowed: true,
    bestFor: 'Growing teams and established companies',
  },
];

export const MEETING_ROOM = {
  name: 'Conference room',
  seats: 8,
  /** Charged to non-members, and to members past their included hours. */
  hourlyRate: 25,
  minimumHours: 1,
  maximumHoursPerSession: 4,
  bookingUrl: `${SITE_URL}/member-resources/meeting-rooms`,
  equipment: ['75-inch smart TV', 'Conference calling', 'Enterprise WiFi', 'Whiteboard-friendly setup'],
  openToPublic: true,
} as const;

export const FLEX_SPACE = {
  name: 'Flex space and event hall',
  url: `${SITE_URL}/member-resources/flex-space`,
  description:
    'A restored 1905 hall on the same lawn, with the original stained glass, a hardwood ' +
    'floor, a projector and a sound system, seating about a hundred. Free for members to ' +
    'book against their weekly credit, every day until 4:30pm.',
  freeUntil: '4:30pm',
  eveningUse:
    'In the evenings and at weekends the hall operates as Merritt Wellness, running yoga, ' +
    'fitness and wellness classes. Workspace members book it at a discount for evening ' +
    'events and take classes at a member rate.',
} as const;

export const POLICIES = {
  term: 'Month-to-month. No long-term lease is required.',
  trial: 'Every prospective member is offered a free full trial day before committing.',
  tours: 'Tours are available on request but are not required to join.',
  deposit:
    "At sign-up you pay your first month (prorated) and your last month's membership fee up front.",
  cancellation:
    "Cancel with 30 days' written notice, given through the member portal, by email, or by " +
    "mail. With proper notice you are not billed for your final month — the last month's fee " +
    'paid at sign-up covers it. Without a full 30 days’ notice that fee is forfeited.',
  keys: 'All keys and access devices must be returned by your last day. Items not returned within 48 hours are subject to a $250 fee each.',
  pets: 'Dogs are welcome in private offices and must stay in the office. Pets are not permitted on the shared coworking floor.',
  noise: 'Calls belong in the phone booths, the flex space or outside. Private office members close the door for calls.',
  payment: 'Credit and debit card, billed monthly.',
} as const;

/** Every membership price as a single sentence — the form an assistant quotes. */
export function priceLine(plan: Plan): string {
  return plan.unit === 'day'
    ? `${plan.name}: $${plan.price} per day`
    : `${plan.name}: $${plan.price} per month`;
}

export const PRICE_RANGE = '$200 - $1200/month';
