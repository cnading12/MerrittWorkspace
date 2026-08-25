import { Metadata } from "next";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import MembershipSchema from "@/components/seo/MembershipSchema";

export const metadata: Metadata = {
  title: "Dedicated Desk $200/mo | Denver Coworking",
  description: "Dedicated desk in Denver's Sloan's Lake — $200/month. 24/7 access, high-speed WiFi, 4hr conference room credits, 4hr weekly flex space credits, free coffee & tea. 3 min to I-25.",
  keywords: [
    "dedicated desk Denver",
    "coworking space Sloan's Lake",
    "shared office space Denver",
    "hot desk Denver",
    "coworking near I-25 Denver"
  ],
  openGraph: {
    title: "Dedicated Desk $200/mo | Coworking Space Sloan's Lake Denver",
    description: "Dedicated desk — $200/month. 24/7 access, WiFi, conference and flex space credits, unlimited coffee. Best value coworking in Denver.",
    url: "https://merrittworkspace.net/membership/dedicated-desk",
    images: [
      {
        url: "/images/og/home-og.jpg",
        width: 1200,
        height: 630,
        alt: "Members at work in the dedicated desk room at Merritt Workspace in Sloan's Lake, Denver - $200/month",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dedicated Desk $200/mo | Merritt Workspace Denver",
    description:
      "A desk of your own for $200/month in Sloan's Lake, Denver. 24/7 access, free parking, conference room and flex space credits.",
    images: ["/images/og/home-og.jpg"],
  },
  alternates: {
    canonical: "https://merrittworkspace.net/membership/dedicated-desk",
  },
};

export default function DedicatedDeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MembershipSchema planIds={["dedicated_desk", "private_dedicated_desk"]} />
      <BreadcrumbSchema
        trail={[
          { name: "Membership", path: "/membership" },
          { name: "Dedicated desk", path: "/membership/dedicated-desk" },
        ]}
      />
      {children}
    </>
  );
}
