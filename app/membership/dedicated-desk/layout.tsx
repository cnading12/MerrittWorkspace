import { Metadata } from "next";
import PageSchema from "@/components/seo/PageSchema";
import { serviceNode } from "@/lib/seo/schema";

const TITLE = "Dedicated Desk $200/mo | Denver Coworking";
const DESCRIPTION =
  "Your own desk in Denver's Sloan's Lake for $200/month — 24/7 access, free parking, a locker, 4hrs monthly conference room credit and 4hrs weekly flex space. Private lockable desks $300/mo. Book a free trial day.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "dedicated desk Denver",
    "coworking space Sloan's Lake",
    "shared office space Denver",
    "desk rental Denver",
    "coworking near I-25 Denver",
    "monthly desk rental Denver",
  ],
  openGraph: {
    title: TITLE,
    description:
      "A desk of your own for $200/month — 24/7 access, free parking, conference room and flex space credits, coffee, tea and beer included.",
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
    title: TITLE,
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
      <PageSchema
        path="/membership/dedicated-desk"
        name="Dedicated Desk"
        description={DESCRIPTION}
        ancestors={[{ name: "Membership", path: "/membership" }]}
        nodes={[
          serviceNode({
            path: "/membership/dedicated-desk",
            name: "Dedicated Desk Coworking",
            description:
              "A permanent desk of your own in a Sloan's Lake, Denver coworking space, on the shared floor or inside a private lockable area, with 24/7 access, free parking, conference room and flex space credits.",
            offerNames: ["Dedicated Desk", "Private Dedicated Desk"],
            image: "/images/dedicated-desks/room-wide.webp",
          }),
        ]}
      />
      {children}
    </>
  );
}
