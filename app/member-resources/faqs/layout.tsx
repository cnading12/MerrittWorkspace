import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coworking FAQs | Hours, Pricing & Amenities",
  description: "Answers to common questions about Merritt Workspace: membership pricing, 24/7 access, parking, meeting rooms, amenities, and touring our Sloan's Lake, Denver coworking space.",
  keywords: [
    "coworking space Sloan's Lake",
    "Denver coworking FAQ",
    "coworking membership Denver",
    "coworking near I-25 Denver"
  ],
  openGraph: {
    title: "Coworking FAQs | Merritt Workspace Denver",
    description: "Membership pricing, 24/7 access, parking, meeting rooms, and amenities at our Sloan's Lake, Denver coworking space.",
    url: "https://merrittworkspace.net/member-resources/faqs",
    images: [
      {
        url: "/images/hero/outside-hero.webp",
        width: 1200,
        height: 630,
        alt: "Merritt Workspace coworking space in Sloan's Lake, Denver",
      },
    ],
  },
  alternates: {
    canonical: "https://merrittworkspace.net/member-resources/faqs",
  },
};

export default function FaqsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
