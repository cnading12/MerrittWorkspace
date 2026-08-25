import { Metadata } from "next";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import MembershipSchema from "@/components/seo/MembershipSchema";

export const metadata: Metadata = {
  title: "Coworking Memberships & Pricing | Denver",
  description: "Compare every workspace at Merritt Workspace in Sloan's Lake, Denver: café memberships from $100/mo, dedicated desks from $200/mo, private offices from $500/mo. 24/7 access, free parking, no long lease.",
  keywords: [
    "affordable coworking Denver",
    "dedicated desk Denver",
    "private office rental Denver",
    "coworking membership Denver",
    "Sloan's Lake office space",
    "coworking near I-25 Denver"
  ],
  openGraph: {
    title: "Coworking Memberships | Merritt Workspace Denver",
    description: "Café memberships from $100/mo, dedicated desks from $200/mo, private offices from $500/mo. 24/7 access, 3 min to I-25 in Sloan's Lake, Denver.",
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
 * below was also being emitted on /membership/dedicated-desk and
 * /membership/private-office — which render their own BreadcrumbSchema, leaving
 * those pages carrying two BreadcrumbLists that disagreed about which page they
 * described, plus a duplicate MembershipSchema. The route group scopes this to
 * the index while leaving the URL as /membership.
 */
export default function MembershipOverviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Every plan as a priced Product/Offer. */}
      <MembershipSchema />
      <BreadcrumbSchema trail={[{ name: "Membership", path: "/membership" }]} />
      {children}
    </>
  );
}
