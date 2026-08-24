import { Metadata } from "next";
import PageSchema from "@/components/seo/PageSchema";
import { ORGANIZATION_ID } from "@/lib/seo/schema";
import { BUSINESS, SITE_URL } from "@/lib/seo/site";

const TITLE = "Contact & Directions | Sloan's Lake";
const DESCRIPTION =
  "Merritt Workspace is at 2246 Irving St, Denver CO 80211, in Sloan's Lake. Call (720) 357-9499 to book a tour or a free trial day. Free on-site parking, 3 minutes to I-25.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "coworking space Sloan's Lake",
    "office space 80211",
    "coworking near I-25 Denver",
    "Denver coworking tour",
    "coworking space near me Denver",
  ],
  openGraph: {
    title: "Contact & Location | Merritt Workspace Denver",
    description:
      "2246 Irving St, Sloan's Lake, Denver. Book a tour or a free trial day — (720) 357-9499. Free parking, 3 min to I-25.",
    url: "https://merrittworkspace.net/contact",
    images: [
      {
        url: "/images/exterior/campus.webp",
        width: 1200,
        height: 630,
        alt: "Merritt Workspace at 2246 Irving Street in Sloan's Lake, Denver",
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
      <PageSchema
        path="/contact"
        name="Contact"
        description={DESCRIPTION}
        nodes={[
          // ContactPage plus an explicit contactPoint: this is the page Google
          // is most likely to pull a phone number from for the knowledge panel,
          // so the number is stated in the markup and not only in the copy.
          {
            "@type": "ContactPage",
            "@id": `${SITE_URL}/contact#contactpage`,
            about: { "@id": ORGANIZATION_ID },
            mainEntity: {
              "@id": ORGANIZATION_ID,
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                telephone: BUSINESS.telephone,
                email: BUSINESS.email,
                areaServed: "US-CO",
                availableLanguage: "English",
              },
            },
          },
        ]}
      />
      {children}
    </>
  );
}
