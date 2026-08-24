import { Metadata } from "next";
import PageSchema from "@/components/seo/PageSchema";
import { OFFERS, ORGANIZATION_ID } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/seo/site";

const TITLE = "Coworking Memberships & Pricing | Denver";
const DESCRIPTION =
  "Compare every workspace at Merritt Workspace in Sloan's Lake, Denver: café memberships from $100/mo, dedicated desks from $200/mo, private offices from $500/mo. 24/7 access, free parking, no long lease. 3 min to I-25.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "coworking membership Denver",
    "coworking prices Denver",
    "dedicated desk Denver",
    "private office rental Denver",
    "affordable coworking Denver",
    "Sloan's Lake office space",
  ],
  openGraph: {
    title: "Coworking Memberships & Pricing | Merritt Workspace Denver",
    description:
      "Café memberships from $100/mo, dedicated desks from $200/mo, private offices from $500/mo. 24/7 access, free parking, 3 min to I-25 in Sloan's Lake, Denver.",
    url: "https://merrittworkspace.net/membership",
    images: [
      {
        url: "/images/og/home-og.jpg",
        width: 1200,
        height: 630,
        alt: "Members at work in the dedicated desk room at Merritt Workspace in Sloan's Lake, Denver",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Coworking Memberships & Pricing | Merritt Workspace Denver",
    description:
      "Café memberships from $100/mo, dedicated desks from $200/mo, private offices from $500/mo in Sloan's Lake, Denver.",
    images: ["/images/og/home-og.jpg"],
  },
  alternates: {
    canonical: "https://merrittworkspace.net/membership",
  },
};

/**
 * Deliberately inside a `(overview)` route group rather than at
 * app/membership/layout.tsx.
 *
 * A layout at the segment root wraps every nested route too, so the schema
 * below was being emitted on /membership/dedicated-desk and
 * /membership/private-office alongside their own — leaving those pages
 * carrying two WebPage nodes and two BreadcrumbLists that disagreed about
 * which page they described. The route group scopes this to the index while
 * leaving the URL as /membership.
 */
export default function MembershipOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageSchema
        path="/membership"
        name="Membership"
        description={DESCRIPTION}
        nodes={[
          // This page's job is the comparison table, so it publishes the whole
          // catalog as an ItemList — the shape Google reads when it wants to
          // show a price range for a query like "coworking prices Denver".
          {
            "@type": "OfferCatalog",
            "@id": `${SITE_URL}/membership#catalog`,
            name: "Merritt Workspace Memberships",
            provider: { "@id": ORGANIZATION_ID },
            itemListElement: OFFERS,
          },
        ]}
      />
      {children}
    </>
  );
}
