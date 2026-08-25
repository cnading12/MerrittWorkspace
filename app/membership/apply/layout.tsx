import { Metadata } from "next";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";

const TITLE = "Apply for Membership | Denver Coworking";
const DESCRIPTION =
  "Apply for a desk, a private office or a free trial day at Merritt Workspace in Sloan's Lake, Denver. Short application, no long lease, 24/7 access and free parking. 3 min to I-25.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "coworking membership Denver",
    "coworking free trial Denver",
    "dedicated desk Denver",
    "private office rental Denver",
  ],
  openGraph: {
    title: "Apply for Membership | Merritt Workspace Denver",
    description:
      "Apply for a desk, a private office or a free trial day in Sloan's Lake, Denver. 24/7 access, free parking, no long lease.",
    url: "https://merrittworkspace.net/membership/apply",
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
    title: "Apply for Membership | Merritt Workspace Denver",
    description:
      "Apply for a desk, a private office or a free trial day in Sloan's Lake, Denver.",
    images: ["/images/og/home-og.jpg"],
  },
  alternates: {
    canonical: "https://merrittworkspace.net/membership/apply",
  },
};

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbSchema trail={[
          { name: "Membership", path: "/membership" },
          { name: "Apply", path: "/membership/apply" },
        ]} />
      {children}
    </>
  );
}
