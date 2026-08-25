import { Metadata } from "next";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";

export const metadata: Metadata = {
  title: "Contact & Directions | Sloan's Lake",
  description: "Visit Merritt Workspace at 2246 Irving St, Denver CO 80211. Schedule a free tour of our Sloan's Lake coworking space. Call (720) 357-9499. 3 minutes to I-25, free parking.",
  keywords: [
    "coworking space Sloan's Lake",
    "office space 80211",
    "coworking near I-25 Denver",
    "Denver coworking tour",
    "West Denver office space"
  ],
  openGraph: {
    title: "Contact & Location | Merritt Workspace Denver",
    description: "2246 Irving St, Sloan's Lake, Denver. Schedule a free tour and trial day. Call (720) 357-9499. 3 min to I-25, free parking available.",
    url: "https://merrittworkspace.net/contact",
    images: [
      {
        url: "/images/exterior/campus.webp",
        width: 1200,
        height: 630,
        alt: "Merritt Workspace location at 2246 Irving Street in Sloan's Lake, Denver",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact & Location | Merritt Workspace Denver",
    description:
      "2246 Irving St, Sloan's Lake, Denver. Book a tour or a free trial day — (720) 357-9499. Free parking.",
    images: ["/images/exterior/campus.webp"],
  },
  alternates: {
    canonical: "https://merrittworkspace.net/contact",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbSchema trail={[{ name: "Contact", path: "/contact" }]} />
      {children}
    </>
  );
}
