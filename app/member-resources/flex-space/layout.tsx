import { Metadata } from "next";
import PageSchema from "@/components/seo/PageSchema";
import { ORGANIZATION_ID } from "@/lib/seo/schema";
import { BUSINESS, SITE_URL } from "@/lib/seo/site";

const TITLE = "Flex Space & 1905 Event Venue | Denver";
const DESCRIPTION =
  "A restored 1905 hall next door to Merritt Workspace in Sloan's Lake, Denver — original stained glass, hardwood floor, projector and sound system. Free to book with membership, weekdays until 4:00.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "event space rental Denver",
    "historic event venue Denver",
    "workshop space Sloan's Lake",
    "coworking event space Denver",
    "meeting space Sloan's Lake Denver",
  ],
  openGraph: {
    title: "Flex Space & Historic Event Venue | Merritt Workspace Denver",
    description:
      "A restored 1905 hall with original stained glass, a projector and a sound system — included with membership at our Sloan's Lake, Denver coworking space.",
    url: "https://merrittworkspace.net/member-resources/flex-space",
    images: [
      {
        url: "/images/flex-space/hall-1.webp",
        width: 1200,
        height: 630,
        alt: "The restored 1905 flex space hall at Merritt Workspace in Sloan's Lake, Denver",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Flex Space & Historic Event Venue | Merritt Workspace Denver",
    description:
      "A restored 1905 hall with stained glass, projector and sound system, free to book with membership in Sloan's Lake, Denver.",
    images: ["/images/flex-space/hall-1.webp"],
  },
  alternates: {
    canonical: "https://merrittworkspace.net/member-resources/flex-space",
  },
};

export default function FlexSpaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageSchema
        path="/member-resources/flex-space"
        name="Flex Space"
        description={DESCRIPTION}
        nodes={[
          // The hall is a distinct physical place from the workspace, on the
          // same lawn. Typed as an EventVenue so it can surface for venue
          // searches in its own right rather than only as an amenity of ours.
          {
            "@type": "EventVenue",
            "@id": `${SITE_URL}/member-resources/flex-space#venue`,
            name: "The Merritt Flex Space",
            description:
              "A restored 1905 hall next to Merritt Workspace in Sloan's Lake, Denver, with the original stained glass, a hardwood floor, a projector and a sound system. Members book it free on weekdays until 4:00pm.",
            url: `${SITE_URL}/member-resources/flex-space`,
            image: [
              `${SITE_URL}/images/flex-space/hall-1.webp`,
              `${SITE_URL}/images/flex-space/rose-window-group.webp`,
            ],
            address: {
              "@type": "PostalAddress",
              streetAddress: BUSINESS.streetAddress,
              addressLocality: BUSINESS.addressLocality,
              addressRegion: BUSINESS.addressRegion,
              postalCode: BUSINESS.postalCode,
              addressCountry: BUSINESS.addressCountry,
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: BUSINESS.latitude,
              longitude: BUSINESS.longitude,
            },
            telephone: BUSINESS.telephone,
            isAccessibleForFree: false,
            amenityFeature: [
              "Projector",
              "Sound System",
              "Original 1905 Stained Glass",
              "Hardwood Floor",
              "Café Seating",
              "Ping Pong Table",
              "Free On-Site Parking",
            ].map((name) => ({
              "@type": "LocationFeatureSpecification",
              name,
              value: true,
            })),
            containedInPlace: { "@id": ORGANIZATION_ID },
          },
        ]}
      />
      {children}
    </>
  );
}
