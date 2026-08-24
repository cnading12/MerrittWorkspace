/**
 * JSON-LD builders.
 *
 * Everything is emitted into one `@graph` per page rather than as a pile of
 * loose <script> tags, and every node carries a stable `@id`. That is what lets
 * the nodes reference each other — the FAQ page, the desk offer and the
 * breadcrumb trail all point back at `#organization` instead of each
 * re-describing the business, so Google resolves them to one entity rather than
 * to several businesses that happen to share an address.
 */

import {
  AREAS_SERVED,
  AMENITIES,
  BUSINESS,
  PRICES,
  PRICE_RANGE,
  SAME_AS,
  SITE_URL,
} from './site';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Node = Record<string, any>;

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

const abs = (path: string) => (path.startsWith('http') ? path : `${SITE_URL}${path}`);

/** Wrap a set of nodes as a single linked-data graph. */
export function graph(nodes: Node[]): Node {
  return { '@context': 'https://schema.org', '@graph': nodes };
}

function offer(name: string, description: string, price: number, unit: 'month' | 'day' | 'hour', url: string): Node {
  return {
    '@type': 'Offer',
    name,
    url: abs(url),
    price: String(price),
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: String(price),
      priceCurrency: 'USD',
      unitText: unit,
    },
    itemOffered: {
      '@type': 'Service',
      name,
      description,
      provider: { '@id': ORGANIZATION_ID },
      areaServed: { '@type': 'City', name: 'Denver' },
    },
  };
}

/** Every sellable thing, in the order a prospect meets them. */
export const OFFERS: Node[] = [
  offer(
    'Day Pass — Dedicated Desk',
    `A single day at a dedicated desk in our Sloan's Lake, Denver coworking space. Includes one hour of conference room time, high-speed WiFi, printing, and the full kitchen with coffee, tea and beer. No membership or commitment required.`,
    PRICES.dayPass,
    'day',
    '/day-pass',
  ),
  offer(
    'Dedicated Desk',
    `Your own permanent desk on the shared coworking floor in Sloan's Lake, Denver. Includes 24/7 access, high-speed WiFi, a numbered locker, 4 hours of monthly conference room credit, 4 hours of weekly flex space credit, five soundproof phone booths, and free coffee, tea and beer.`,
    PRICES.dedicatedDesk,
    'month',
    '/membership/dedicated-desk',
  ),
  offer(
    'Private Dedicated Desk',
    `A dedicated desk inside a private, lockable office area rather than the shared floor, in Denver's Sloan's Lake neighborhood. Includes 24/7 access, high-speed WiFi, 4 hours of monthly conference room credit and 4 hours of weekly flex space credit.`,
    PRICES.privateDedicatedDesk,
    'month',
    '/membership/dedicated-desk',
  ),
  offer(
    'Single Private Office',
    `A private, lockable office for one person in Sloan's Lake, Denver. Includes a professional business address, 24/7 access, 14 hours of monthly conference room credit, 6 hours of weekly flex space credit, and mail handling. Dog-friendly.`,
    PRICES.privateOfficeSingle,
    'month',
    '/membership/private-office',
  ),
  offer(
    '2-Desk Private Office',
    `A private, lockable office for two people three minutes from I-25 in Denver. Includes a professional business address, 24/7 access, 14 hours of monthly conference room credit and 6 hours of weekly flex space credit.`,
    PRICES.privateOfficeDouble,
    'month',
    '/membership/private-office',
  ),
  offer(
    'Large Team Office (4-8 Desks)',
    `A private office for a team of four to eight in Sloan's Lake, Denver. Includes a professional business address, 24/7 access, 20 hours of monthly conference room credit, 8 hours of weekly flex space credit and priority event space booking.`,
    PRICES.privateOfficeLarge,
    'month',
    '/membership/private-office',
  ),
  offer(
    'Conference Room Rental',
    `An eight-person conference room with a 75-inch display, fast WiFi and free parking, in Sloan's Lake, Denver. Bookable by the hour by members and non-members alike, one to four hours per session.`,
    PRICES.conferenceHourly,
    'hour',
    '/member-resources/meeting-rooms',
  ),
];

/** The business itself. One node, referenced by @id from everywhere else. */
export function organizationNode(): Node {
  return {
    '@type': 'CoworkingSpace',
    '@id': ORGANIZATION_ID,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    alternateName: BUSINESS.alternateName,
    description: `Independent coworking space in Sloan's Lake, Denver. Dedicated desks from $${PRICES.dedicatedDesk} a month, private offices from $${PRICES.privateOfficeSingle}, and $${PRICES.dayPass} day passes — with 24/7 access, free on-site parking, and a restored 1905 event space on the same lawn.`,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      '@id': `${SITE_URL}/#logo`,
      url: abs('/images/brand/logo.png'),
      caption: BUSINESS.name,
    },
    image: [
      abs('/images/og/home-og.jpg'),
      abs('/images/dedicated-desks/room-wide.webp'),
      abs('/images/offices/single-alt.webp'),
      abs('/images/exterior/campus.webp'),
    ],
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.addressLocality,
      addressRegion: BUSINESS.addressRegion,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.addressCountry,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: BUSINESS.latitude,
      longitude: BUSINESS.longitude,
    },
    hasMap: BUSINESS.mapUrl,
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '00:00',
        closes: '23:59',
        description: '24/7 access for members with an access code',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '18:00',
        description: 'Building unlocked; tours and member services',
      },
    ],
    priceRange: PRICE_RANGE,
    currenciesAccepted: 'USD',
    paymentAccepted: ['Credit Card', 'Debit Card'],
    // A 15km radius covers Denver proper and the near-west suburbs we actually
    // draw from. Paired with the named neighbourhoods below, which is what
    // matches the way people phrase local searches.
    areaServed: [
      {
        '@type': 'GeoCircle',
        geoMidpoint: {
          '@type': 'GeoCoordinates',
          latitude: BUSINESS.latitude,
          longitude: BUSINESS.longitude,
        },
        geoRadius: '15000',
      },
      { '@type': 'City', name: 'Denver', sameAs: 'https://en.wikipedia.org/wiki/Denver' },
      ...AREAS_SERVED.map((name) => ({
        '@type': 'Place',
        name,
        containedInPlace: { '@type': 'City', name: 'Denver' },
      })),
    ],
    amenityFeature: AMENITIES.map((name) => ({
      '@type': 'LocationFeatureSpecification',
      name,
      value: true,
    })),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Coworking Memberships and Day Passes',
      itemListElement: OFFERS,
    },
    makesOffer: OFFERS,
    sameAs: SAME_AS,
    foundingDate: BUSINESS.foundingDate,
    knowsAbout: [
      'Coworking',
      'Office Space Rental',
      'Private Office Rental',
      'Meeting Room Rental',
      'Day Pass Coworking',
      'Remote Work',
      'Event Space Rental',
    ],
    slogan: BUSINESS.slogan,
    isAccessibleForFree: false,
    publicAccess: false,
    parentOrganization: { '@type': 'Organization', name: 'Merritt House' },
  };
}

export function webSiteNode(): Node {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: SITE_URL,
    name: BUSINESS.name,
    description: `Coworking space, private offices and meeting rooms in Sloan's Lake, Denver.`,
    publisher: { '@id': ORGANIZATION_ID },
    inLanguage: 'en-US',
  };
}

export type Crumb = { name: string; path: string };

/**
 * Breadcrumbs tell Google the site's shape and replace the raw URL in the
 * result with a readable trail. Always start the trail at Home.
 */
export function breadcrumbNode(crumbs: Crumb[]): Node {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${abs(crumbs[crumbs.length - 1].path)}#breadcrumb`,
    itemListElement: [{ name: 'Home', path: '/' }, ...crumbs].map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(c.path),
    })),
  };
}

export type Faq = { question: string; answer: string };

export function faqPageNode(path: string, faqs: Faq[]): Node {
  return {
    '@type': 'FAQPage',
    '@id': `${abs(path)}#faq`,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

/**
 * A single sellable service, for the page that sells it. `offerNames` picks
 * rows out of OFFERS so a product page can never quote a price the homepage
 * catalog contradicts.
 */
export function serviceNode(args: {
  path: string;
  name: string;
  description: string;
  offerNames: string[];
  image?: string;
}): Node {
  const offers = OFFERS.filter((o) => args.offerNames.includes(o.name));
  if (offers.length !== args.offerNames.length) {
    const missing = args.offerNames.filter((n) => !OFFERS.some((o) => o.name === n));
    throw new Error(`serviceNode: unknown offer name(s): ${missing.join(', ')}`);
  }
  return {
    '@type': 'Service',
    '@id': `${abs(args.path)}#service`,
    name: args.name,
    description: args.description,
    serviceType: args.name,
    provider: { '@id': ORGANIZATION_ID },
    areaServed: { '@type': 'City', name: 'Denver' },
    ...(args.image ? { image: abs(args.image) } : {}),
    offers: offers.length === 1 ? offers[0] : offers,
  };
}

/** The page itself, tied to the site and the business that publishes it. */
export function webPageNode(args: { path: string; name: string; description: string }): Node {
  return {
    '@type': 'WebPage',
    '@id': `${abs(args.path)}#webpage`,
    url: abs(args.path),
    name: args.name,
    description: args.description,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': ORGANIZATION_ID },
    primaryImageOfPage: { '@id': `${SITE_URL}/#logo` },
    breadcrumb: { '@id': `${abs(args.path)}#breadcrumb` },
    inLanguage: 'en-US',
  };
}
