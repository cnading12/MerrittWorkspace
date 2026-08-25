import { Metadata } from "next";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";

const TITLE = "Merritt Snackshop | Snacks & Drinks";
const DESCRIPTION =
  "Order drinks, snacks and quick meals to your desk at Merritt Workspace in Sloan's Lake, Denver. Coffee, tea and beer are always free; everything else is a few taps away.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: "Merritt Snackshop | Merritt Workspace Denver",
    description:
      "Drinks, snacks and quick meals delivered to your desk at our Sloan's Lake, Denver coworking space.",
    url: "https://merrittworkspace.net/member-resources/snackshop",
    images: [
      {
        url: "/images/amenities/snackshop-case.webp",
        width: 1200,
        height: 630,
        alt: "The Snackshop case at Merritt Workspace in Sloan's Lake, Denver",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Merritt Snackshop | Merritt Workspace Denver",
    description:
      "Drinks, snacks and quick meals delivered to your desk at our Sloan's Lake, Denver coworking space.",
    images: ["/images/amenities/snackshop-case.webp"],
  },
  alternates: {
    canonical: "https://merrittworkspace.net/member-resources/snackshop",
  },
};

export default function SnackshopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbSchema trail={[{ name: "Snackshop", path: "/member-resources/snackshop" }]} />
      {children}
    </>
  );
}
