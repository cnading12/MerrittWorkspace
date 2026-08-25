import { SITE_URL } from '@/lib/seo/business';
import JsonLd from './JsonLd';

/**
 * Breadcrumbs tell a retrieval engine where a page sits in the site, which is
 * what lets it say "their private office page" rather than "a page on their
 * site". Pass the trail without the home crumb; it is prepended here.
 */
export default function BreadcrumbSchema({
  trail,
}: {
  trail: { name: string; path: string }[];
}) {
  const items = [{ name: 'Home', path: '/' }, ...trail];

  return (
    <JsonLd
      schema={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: `${SITE_URL}${item.path === '/' ? '' : item.path}`,
        })),
      }}
    />
  );
}
