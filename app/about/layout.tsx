import { Metadata } from "next";
import PageSchema from "@/components/seo/PageSchema";

const TITLE = "About Us | Sloan's Lake Coworking, Denver";
const DESCRIPTION =
  "Merritt Workspace is an independent, locally owned coworking space in Sloan's Lake, Denver, sharing a lawn with a restored 1905 hall. Not a chain, no long leases, free parking, 3 min to I-25.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "Sloan's Lake office space",
    "independent coworking Denver",
    "locally owned coworking Denver",
    "historic coworking Denver",
    "West Denver coworking",
  ],
  openGraph: {
    title: "About Merritt Workspace | Independent Coworking in Denver",
    description:
      "A locally owned coworking space in Sloan's Lake, Denver, next to a restored 1905 hall on the same lawn. Not a chain, no long leases.",
    url: "https://merrittworkspace.net/about",
    images: [
      {
        url: "/images/flex-space/exterior.webp",
        width: 1200,
        height: 630,
        alt: "The historic 1905 building beside Merritt Workspace in Sloan's Lake, Denver",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Merritt Workspace | Independent Coworking in Denver",
    description:
      "A locally owned coworking space in Sloan's Lake, Denver, next to a restored 1905 hall on the same lawn.",
    images: ["/images/flex-space/exterior.webp"],
  },
  alternates: {
    canonical: "https://merrittworkspace.net/about",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageSchema path="/about" name="About" description={DESCRIPTION} />
      {children}
    </>
  );
}
