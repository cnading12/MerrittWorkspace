import { Metadata } from "next";
import PageSchema from "@/components/seo/PageSchema";
import { faqPageNode } from "@/lib/seo/schema";
import { FAQS } from "@/lib/seo/faqs";

const TITLE = "Coworking FAQs | Denver Coworking Space";
const DESCRIPTION =
  "Answers about Merritt Workspace in Sloan's Lake, Denver: 24/7 access codes, free parking, conference room booking and rates, phone booths, dog policy, WiFi, and how to cancel a membership.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "coworking space Sloan's Lake",
    "Denver coworking FAQ",
    "coworking membership Denver",
    "coworking parking Denver",
    "coworking near I-25 Denver",
  ],
  openGraph: {
    title: "Coworking FAQs | Merritt Workspace Denver",
    description:
      "Access codes, free parking, conference room rates, phone booths, dog policy and cancellation — answered for our Sloan's Lake, Denver coworking space.",
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
      <PageSchema
        path="/member-resources/faqs"
        name="FAQs"
        description={DESCRIPTION}
        nodes={[faqPageNode("/member-resources/faqs", FAQS)]}
      />
      {children}
    </>
  );
}
