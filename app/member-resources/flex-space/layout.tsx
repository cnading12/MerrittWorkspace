import { Metadata } from "next";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";

export const metadata: Metadata = {
  title: "Flex Space & 1905 Event Venue | Denver",
  description:
    "A restored 1905 hall next door to Merritt Workspace in Sloan's Lake, Denver. Original stained glass, hardwood floor, projector and sound system — free to book with membership, weekdays until 4:00.",
  keywords: [
    "event space rental Denver",
    "workshop space Sloan's Lake",
    "historic event venue Denver",
    "coworking event space Denver",
  ],
  openGraph: {
    title: "Flex Space & Event Venue | Merritt Workspace Denver",
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
      <BreadcrumbSchema
        trail={[
          { name: "Member resources", path: "/member-resources/flex-space" },
          { name: "Flex space", path: "/member-resources/flex-space" },
        ]}
      />
      {children}
    </>
  );
}
