import { Metadata } from "next";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import FaqSchema from "@/components/seo/FaqSchema";
import { FAQS } from "@/lib/seo/faqs";
import { SITE_URL } from "@/lib/seo/business";

export const metadata: Metadata = {
  title: "Coworking FAQs | Denver Coworking Space",
  description: "Answers to common questions about Merritt Workspace: membership pricing, 24/7 access, parking, conference room, amenities, and touring our Sloan's Lake, Denver coworking space.",
  keywords: [
    "coworking space Sloan's Lake",
    "Denver coworking FAQ",
    "coworking membership Denver",
    "coworking near I-25 Denver"
  ],
  openGraph: {
    title: "Coworking FAQs | Merritt Workspace Denver",
    description: "Membership pricing, 24/7 access, parking, conference room, and amenities at our Sloan's Lake, Denver coworking space.",
    url: "https://merrittworkspace.net/member-resources/faqs",
    images: [
      {
        url: "/images/exterior/campus.webp",
        width: 1200,
        height: 630,
        alt: "Merritt Workspace coworking space in Sloan's Lake, Denver",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Coworking FAQs | Merritt Workspace Denver",
    description:
      "Access, parking, conference room rates, phone booths and cancellation, answered for our Sloan's Lake, Denver coworking space.",
    images: ["/images/exterior/campus.webp"],
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
  return (
    <>
      {/* Every question on the page, in the markup, as FAQPage data. Answer
          engines quote from this directly — it is already question-shaped. */}
      <FaqSchema faqs={FAQS} id={`${SITE_URL}/member-resources/faqs#faq`} />
      <BreadcrumbSchema
        trail={[
          { name: "Member resources", path: "/member-resources/faqs" },
          { name: "FAQs", path: "/member-resources/faqs" },
        ]}
      />
      {children}
    </>
  );
}
