import { Metadata } from "next";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import MembershipSchema from "@/components/seo/MembershipSchema";

const TITLE = "Café Membership $100/mo | Denver Coworking";
const DESCRIPTION =
  "Work from the café side of our restored 1905 hall in Sloan's Lake, Denver for $100 a month. Open seating, free coffee, tea and beer, WiFi, printing and parking, plus monthly conference room and weekly flex space credit. Limited to 15 members.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "affordable coworking Denver",
    "cafe coworking Denver",
    "coworking space Sloan's Lake",
    "cheap coworking membership Denver",
    "open seating coworking Denver",
    "part time coworking Denver",
  ],
  openGraph: {
    title: "Café Membership $100/mo | Merritt Workspace Denver",
    description:
      "Open seating in a restored 1905 hall in Sloan's Lake, Denver — $100 a month with coffee, tea and beer, WiFi, printing and free parking. Limited to 15 members.",
    url: "https://merrittworkspace.net/membership/cafe",
    images: [
      {
        url: "/images/flex-space/cafe.webp",
        width: 1200,
        height: 630,
        alt: "The café inside the restored 1905 flex space at Merritt Workspace in Sloan's Lake, Denver",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Café Membership $100/mo | Merritt Workspace Denver",
    description:
      "Open seating in a restored 1905 hall in Sloan's Lake, Denver — $100 a month, everything included except the desk.",
    images: ["/images/flex-space/cafe.webp"],
  },
  alternates: {
    canonical: "https://merrittworkspace.net/membership/cafe",
  },
};

export default function CafeMembershipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MembershipSchema planIds={["cafe_membership"]} />
      <BreadcrumbSchema
        trail={[
          { name: "Membership", path: "/membership" },
          { name: "Café membership", path: "/membership/cafe" },
        ]}
      />
      {children}
    </>
  );
}
