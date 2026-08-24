/**
 * Single source of truth for the facts search engines read about us.
 *
 * NAP (name / address / phone) consistency is the backbone of local ranking:
 * Google cross-references what the site says against the Google Business
 * Profile and every directory listing, and punishes disagreement. Before this
 * file those strings were retyped in five places and had already drifted once
 * (the schema said dedicated desks were $300 while every page said $200).
 * Anything a crawler consumes should be imported from here.
 *
 * If a price changes, change it here and in lib/portal/pricing.ts — the test in
 * __tests__/seo-schema.test.ts fails if the two disagree.
 */

export const SITE_URL = 'https://merrittworkspace.net';

export const BUSINESS = {
  name: 'Merritt Workspace',
  legalName: 'Merritt Workspace',
  alternateName: 'Merritt Workspace Coworking',
  slogan: 'Where Work Meets Community',
  foundingDate: '2023',
  telephone: '+1-720-357-9499',
  telephoneDisplay: '(720) 357-9499',
  email: 'memberservices@merrittworkspace.net',
  streetAddress: '2246 Irving Street',
  addressLocality: 'Denver',
  addressRegion: 'CO',
  postalCode: '80211',
  addressCountry: 'US',
  latitude: 39.75098609588881,
  longitude: -105.03225422342487,
  /** Google Business Profile map link — the cid is the profile's own id. */
  mapUrl: 'https://www.google.com/maps?cid=10105178442159244045',
} as const;

/** Profiles that prove we are the same entity Google already knows about. */
export const SAME_AS = [
  'https://www.instagram.com/themerritthouse/',
  'https://www.facebook.com/profile.php?id=61577369304992',
  BUSINESS.mapUrl,
  'https://www.merrittwellness.net',
];

/**
 * Prices in whole dollars, mirroring lib/portal/pricing.ts. Kept as numbers so
 * schema and copy can format them differently without the value drifting.
 */
export const PRICES = {
  dedicatedDesk: 200,
  privateDedicatedDesk: 300,
  dayPass: 30,
  privateOfficeSingle: 500,
  privateOfficeDouble: 700,
  privateOfficeLarge: 1200,
  /** Conference room, per hour, for guests and over-allotment members. */
  conferenceHourly: 25,
} as const;

export const PRICE_RANGE = `$${PRICES.dayPass} - $${PRICES.privateOfficeLarge}`;

/** Neighbourhoods we genuinely serve — these are the local intent queries. */
export const AREAS_SERVED = [
  "Sloan's Lake",
  'West Highland',
  'Highland',
  'Berkeley',
  'Jefferson Park',
  'West Colfax',
  'Edgewater',
  'Wheat Ridge',
  'Lakewood',
];

export const AMENITIES = [
  'High-Speed WiFi',
  '24/7 Access',
  'Free On-Site Parking',
  'Conference Room',
  'Five Soundproof Phone Booths',
  'Full Kitchen',
  'Free Coffee, Tea and Beer',
  'Mail and Package Handling',
  'Historic 1905 Event Space',
  'Snack Shop',
  'Lockers',
  'Printing',
  'Ping Pong Table',
  'Pet-Friendly (Private Offices Only)',
];
