import JsonLd from '@/components/seo/JsonLd';
import { graph, organizationNode, webSiteNode } from '@/lib/seo/schema';

/**
 * The site-wide entity graph: who we are and what site this is. Rendered once
 * from the root layout, so every page carries it.
 *
 * Page-specific nodes (breadcrumbs, FAQs, the service a given page sells) live
 * in that page's own layout and reference this one by @id rather than
 * redeclaring the business.
 */
export default function LocalBusinessSchema() {
  return <JsonLd data={graph([organizationNode(), webSiteNode()])} />;
}
