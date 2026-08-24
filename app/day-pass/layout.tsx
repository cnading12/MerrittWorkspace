import { Metadata } from "next";
import PageSchema from "@/components/seo/PageSchema";
import { faqPageNode, serviceNode } from "@/lib/seo/schema";
import { DAY_PASS_FAQS } from "@/lib/seo/faqs";

const TITLE = "Day Pass Coworking Denver | $30 a Day";
const DESCRIPTION =
  "Drop in for the day at Merritt Workspace in Sloan's Lake, Denver. $30 gets you a dedicated desk, an hour of conference room time, fast WiFi, printing, free parking and free coffee, tea and beer. No membership required.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "day pass coworking Denver",
    "drop in coworking Denver",
    "coworking day pass Sloan's Lake",
    "day office rental Denver",
    "work from anywhere Denver",
    "hot desk Denver day rate",
    "temporary office space Denver",
  ],
  openGraph: {
    title: "Day Pass Coworking Denver | $30/day | Sloan's Lake",
    description:
      "$30 for a desk of your own for the day in Sloan's Lake, Denver — conference room time, fast WiFi, printing, free parking, free coffee and beer. No membership needed.",
    url: "https://merrittworkspace.net/day-pass",
    images: [
      {
        url: "/images/og/home-og.jpg",
        width: 1200,
        height: 630,
        alt: "The dedicated desk room at Merritt Workspace in Sloan's Lake, Denver, where day pass visitors work",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Day Pass Coworking Denver | $30/day | Sloan's Lake",
    description:
      "$30 for a desk of your own for the day in Sloan's Lake, Denver. No membership, free parking, coffee and beer included.",
    images: ["/images/og/home-og.jpg"],
  },
  alternates: {
    canonical: "https://merrittworkspace.net/day-pass",
  },
};

export default function DayPassLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageSchema
        path="/day-pass"
        name="Day Pass"
        description={DESCRIPTION}
        nodes={[
          serviceNode({
            path: "/day-pass",
            name: "Coworking Day Pass",
            description:
              "A single day at a dedicated desk in Sloan's Lake, Denver for $30, including an hour of conference room time, fast WiFi, printing, free parking and free coffee, tea and beer. No membership or commitment.",
            offerNames: ["Day Pass — Dedicated Desk"],
            image: "/images/dedicated-desks/room-occupied.webp",
          }),
          faqPageNode("/day-pass", DAY_PASS_FAQS),
        ]}
      />
      {children}
    </>
  );
}
