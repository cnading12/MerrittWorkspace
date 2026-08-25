import { BUSINESS, MEETING_ROOM, SITE_URL } from '@/lib/seo/business';
import JsonLd from './JsonLd';

/**
 * The conference room is the one thing here a non-member can buy outright, so
 * it gets its own `Service` node rather than living only as a membership perk.
 * "Meeting room rental Denver" is a query with commercial intent and no
 * membership attached, and this is the node that answers it.
 */
export default function MeetingRoomSchema() {
  return (
    <JsonLd
      schema={{
        '@context': 'https://schema.org',
        '@type': 'Service',
        '@id': `${MEETING_ROOM.bookingUrl}#service`,
        name: 'Conference room rental',
        serviceType: 'Meeting room rental',
        description:
          `An hourly conference room in ${BUSINESS.neighborhood}, Denver, seating ` +
          `${MEETING_ROOM.seats} with a ${MEETING_ROOM.equipment[0].toLowerCase()}, conference ` +
          `calling and fast WiFi. Open to non-members at $${MEETING_ROOM.hourlyRate} per hour ` +
          `with free on-site parking. Members book against the hours their membership includes.`,
        url: MEETING_ROOM.bookingUrl,
        provider: { '@id': `${SITE_URL}/#organization` },
        areaServed: [
          { '@type': 'City', name: 'Denver' },
          { '@type': 'Neighborhood', name: BUSINESS.neighborhood },
        ],
        offers: {
          '@type': 'Offer',
          price: String(MEETING_ROOM.hourlyRate),
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: MEETING_ROOM.bookingUrl,
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: String(MEETING_ROOM.hourlyRate),
            priceCurrency: 'USD',
            unitCode: 'HUR',
            unitText: 'hour',
          },
          eligibleQuantity: {
            '@type': 'QuantitativeValue',
            minValue: MEETING_ROOM.minimumHours,
            maxValue: MEETING_ROOM.maximumHoursPerSession,
            unitCode: 'HUR',
          },
        },
        termsOfService: `${SITE_URL}/terms`,
      }}
    />
  );
}
