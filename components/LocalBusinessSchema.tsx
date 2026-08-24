import {
  AMENITIES,
  BUSINESS,
  MEETING_ROOM,
  PLANS,
  POLICIES,
  PRICE_RANGE,
  SITE_URL,
} from '@/lib/seo/business';
import JsonLd from '@/components/seo/JsonLd';

/**
 * The site-wide entity graph: who this business is, where it is, what it costs,
 * and what the site itself is.
 *
 * Every value is read from `lib/seo/business.ts`, which is also what generates
 * `/llms.txt` and the FAQ answers. A retrieval engine that cross-checks the
 * JSON-LD against the visible page against the plain-text file finds the same
 * numbers three times — which is the difference between being quoted with
 * confidence and being skipped for a competitor whose facts agree with
 * themselves.
 */
export default function LocalBusinessSchema() {
  const organization = {
    '@type': 'CoworkingSpace',
    '@id': `${SITE_URL}/#organization`,
    name: BUSINESS.name,
    alternateName: BUSINESS.alternateName,
    description: BUSINESS.summary,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_URL}/images/brand/logo.png`,
      caption: `${BUSINESS.name} logo`,
    },
    image: [
      `${SITE_URL}/images/exterior/campus.webp`,
      `${SITE_URL}/images/og/home-og.jpg`,
      `${SITE_URL}/images/offices/single-alt.webp`,
      `${SITE_URL}/images/flex-space/rose-window-group.webp`,
    ],
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.address.street,
      addressLocality: BUSINESS.address.locality,
      addressRegion: BUSINESS.address.region,
      postalCode: BUSINESS.address.postalCode,
      addressCountry: BUSINESS.address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: BUSINESS.geo.latitude,
      longitude: BUSINESS.geo.longitude,
    },
    hasMap: BUSINESS.mapUrl,

    // Three distinct clocks, which prospects and models alike tend to collapse
    // into one. Each specification carries a description saying which is which.
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '00:00',
        closes: '23:59',
        description: `Member access with a personal keypad code: ${BUSINESS.hours.memberAccess}`,
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '18:00',
        description: `Building unlocked, no access code required: ${BUSINESS.hours.buildingUnlocked}`,
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '17:00',
        description: `Staffed for tours and support: ${BUSINESS.hours.staffed}`,
      },
    ],

    priceRange: PRICE_RANGE,
    currenciesAccepted: 'USD',
    paymentAccepted: ['Credit Card', 'Debit Card'],
    smokingAllowed: false,
    publicAccess: false,
    isAccessibleForFree: false,

    areaServed: [
      { '@type': 'City', name: 'Denver', sameAs: 'https://en.wikipedia.org/wiki/Denver' },
      {
        '@type': 'Neighborhood',
        name: "Sloan's Lake",
        containedInPlace: { '@type': 'City', name: 'Denver' },
      },
      { '@type': 'Neighborhood', name: 'West Denver' },
      { '@type': 'Neighborhood', name: 'Highlands' },
      { '@type': 'Neighborhood', name: 'West Colfax' },
      { '@type': 'Neighborhood', name: 'Berkeley' },
      { '@type': 'City', name: 'Edgewater' },
      { '@type': 'City', name: 'Lakewood' },
    ],

    amenityFeature: AMENITIES.map(name => ({
      '@type': 'LocationFeatureSpecification',
      name,
      value: true,
    })),

    // Every purchasable thing in one catalog, prices included, so a model that
    // reads only this node still gets the whole price list right.
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Coworking memberships and room rental',
      itemListElement: [
        ...PLANS.map(plan => ({
          '@type': 'Offer',
          name: plan.name,
          url: plan.url,
          price: String(plan.price),
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          itemOffered: {
            '@type': 'Service',
            name: plan.name,
            description: `${plan.summary} For ${plan.capacity.toLowerCase()}. ${plan.privacy}.`,
          },
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: String(plan.price),
            priceCurrency: 'USD',
            unitText: plan.unit,
          },
        })),
        {
          '@type': 'Offer',
          name: 'Conference room rental (hourly, open to non-members)',
          url: MEETING_ROOM.bookingUrl,
          price: String(MEETING_ROOM.hourlyRate),
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          itemOffered: {
            '@type': 'Service',
            name: 'Conference room rental',
            description: `Conference room seating ${MEETING_ROOM.seats}, with a 75-inch screen and conference calling. Bookable by anyone at $${MEETING_ROOM.hourlyRate} per hour.`,
          },
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: String(MEETING_ROOM.hourlyRate),
            priceCurrency: 'USD',
            unitCode: 'HUR',
            unitText: 'hour',
          },
        },
      ],
    },

    // Plain-language answers to the questions that decide a recommendation.
    // `knowsAbout` is the loosest slot in the vocabulary and the one most often
    // surfaced verbatim, so it carries facts rather than keywords.
    knowsAbout: [
      'Coworking',
      'Private office rental',
      'Meeting room and conference room rental',
      'Hot desks and dedicated desks',
      'Remote work and hybrid work',
      'Event and workshop space',
      'Business address and mail handling',
      `Membership terms: ${POLICIES.term}`,
      `Free trial: ${POLICIES.trial}`,
      `Parking: ${BUSINESS.parking}`,
    ],

    makesOffer: PLANS.map(plan => ({
      '@type': 'Offer',
      name: plan.name,
      price: String(plan.price),
      priceCurrency: 'USD',
      url: plan.url,
    })),

    sameAs: [...BUSINESS.socialProfiles],
    foundingDate: BUSINESS.founded,
    slogan: BUSINESS.slogan,
    numberOfEmployees: { '@type': 'QuantitativeValue', minValue: 1, maxValue: 10 },
    potentialAction: {
      '@type': 'ReserveAction',
      name: 'Book a free trial day',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/membership/apply?trial=1`,
        actionPlatform: [
          'https://schema.org/DesktopWebPlatform',
          'https://schema.org/MobileWebPlatform',
        ],
      },
      result: { '@type': 'Reservation', name: 'Free trial day at Merritt Workspace' },
    },
  };

  const website = {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: BUSINESS.name,
    description: BUSINESS.summary,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-US',
  };

  // The building itself, as a place distinct from the business that occupies
  // it — this is what a "where is it / can I park" question resolves against.
  const place = {
    '@type': 'Place',
    '@id': `${SITE_URL}/#place`,
    name: `${BUSINESS.name}, ${BUSINESS.address.street}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.address.street,
      addressLocality: BUSINESS.address.locality,
      addressRegion: BUSINESS.address.region,
      postalCode: BUSINESS.address.postalCode,
      addressCountry: BUSINESS.address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: BUSINESS.geo.latitude,
      longitude: BUSINESS.geo.longitude,
    },
    hasMap: BUSINESS.mapUrl,
    publicAccess: false,
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Free on-site parking', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Free street parking', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Historic 1905 building', value: true },
    ],
    containedInPlace: { '@type': 'Place', name: "Sloan's Lake, Denver, Colorado" },
  };

  return <JsonLd schema={{ '@context': 'https://schema.org', '@graph': [organization, website, place] }} />;
}
