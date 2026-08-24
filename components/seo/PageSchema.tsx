import JsonLd from '@/components/seo/JsonLd';
import {
  breadcrumbNode,
  graph,
  webPageNode,
  type Crumb,
} from '@/lib/seo/schema';

type Props = {
  /** Path of this page, e.g. "/membership/dedicated-desk". */
  path: string;
  /** Page name, as it should read in the breadcrumb trail. */
  name: string;
  description: string;
  /** Ancestors between Home and this page. Home and self are added for you. */
  ancestors?: Crumb[];
  /** Page-specific nodes: a Service, an FAQPage, and so on. */
  nodes?: Record<string, unknown>[];
};

/**
 * The per-page half of the entity graph: what this page is, where it sits in
 * the site, and anything it specifically describes.
 *
 * Drop it into a route's layout.tsx alongside `children`. The business itself
 * is declared once in the root layout, so nothing here repeats it — these nodes
 * only reference it.
 */
export default function PageSchema({ path, name, description, ancestors = [], nodes = [] }: Props) {
  const crumbs: Crumb[] = [...ancestors, { name, path }];
  return (
    <JsonLd
      data={graph([
        webPageNode({ path, name, description }),
        breadcrumbNode(crumbs),
        ...nodes,
      ])}
    />
  );
}
