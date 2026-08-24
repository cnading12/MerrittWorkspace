import { BUSINESS, PLANS, SITE_URL, type Plan } from '@/lib/seo/business';
import JsonLd from './JsonLd';

/**
 * Each membership as its own `Product` with a concrete `Offer`.
 *
 * The business-level `hasOfferCatalog` in `LocalBusinessSchema` says the prices
 * exist; this says what each one buys, at a URL a citation can point at. An
 * assistant asked "what does a private office in Denver cost" can lift a single
 * offer node and be right about the number, the capacity and the page it came
 * from.
 */
function offerFor(plan: Plan) {
  const includes = [
    `${plan.capacity}`,
    plan.privacy,
    plan.meetingCreditPerMonth !== null
      ? `${plan.meetingCreditPerMonth} hours of conference room credit per month`
      : null,
    plan.flexCreditPerWeek !== null
      ? `${plan.flexCreditPerWeek} hours of flex space credit per week`
      : null,
    plan.businessAddress ? 'Professional business address' : null,
    plan.dogsAllowed ? 'Dog-friendly' : null,
  ].filter(Boolean);

  return {
    '@type': 'Product',
    '@id': `${plan.url}#${plan.id}`,
    name: `${plan.name} — ${BUSINESS.name}`,
    description: `${plan.summary} ${includes.join('. ')}.`,
    category: plan.privacy.includes('Private') ? 'Private office rental' : 'Coworking membership',
    url: plan.url,
    brand: { '@type': 'Organization', name: BUSINESS.name, '@id': `${SITE_URL}/#organization` },
    audience: { '@type': 'BusinessAudience', name: plan.bestFor },
    offers: {
      '@type': 'Offer',
      price: String(plan.price),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: plan.url,
      seller: { '@id': `${SITE_URL}/#organization` },
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: String(plan.price),
        priceCurrency: 'USD',
        unitCode: plan.unit === 'day' ? 'DAY' : 'MON',
        unitText: plan.unit,
        // No lease and no minimum term beyond the current month.
        billingDuration: plan.unit === 'month' ? 1 : undefined,
        billingIncrement: plan.unit === 'month' ? 1 : undefined,
      },
      areaServed: { '@type': 'City', name: 'Denver' },
      eligibleRegion: { '@type': 'State', name: 'Colorado' },
    },
  };
}

/** Pass ids to narrow the list to the plans a given page is actually about. */
export default function MembershipSchema({ planIds }: { planIds?: string[] }) {
  const plans = planIds ? PLANS.filter(p => planIds.includes(p.id)) : PLANS;
  return <JsonLd schema={plans.map(offerFor)} />;
}
