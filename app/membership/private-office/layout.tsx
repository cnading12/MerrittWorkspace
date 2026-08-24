import { Metadata } from "next";
import PageSchema from "@/components/seo/PageSchema";
import { serviceNode } from "@/lib/seo/schema";

const TITLE = "Private Office Rental Denver | $500/mo";
const DESCRIPTION =
  "Private lockable offices for 1-8 people in Sloan's Lake, Denver, from $500/month. Professional business address, 24/7 access, up to 20hrs monthly conference room credit, free parking, dog-friendly. 3 min to I-25.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "private office rental Denver",
    "office space Sloan's Lake",
    "small office rental Denver",
    "team office space Denver",
    "office space for rent Denver 80211",
    "coworking near I-25 Denver",
  ],
  openGraph: {
    title: TITLE,
    description:
      "Lockable private offices for 1-8 people from $500/month. Business address, 24/7 access, conference room credits, free parking. Sloan's Lake, Denver.",
    url: "https://merrittworkspace.net/membership/private-office",
    images: [
      {
        url: "/images/offices/single-alt.webp",
        width: 1200,
        height: 630,
        alt: "A private lockable office at Merritt Workspace in Sloan's Lake, Denver",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description:
      "Lockable private offices for 1-8 people from $500/month in Sloan's Lake, Denver. Business address, 24/7 access, free parking.",
    images: ["/images/offices/single-alt.webp"],
  },
  alternates: {
    canonical: "https://merrittworkspace.net/membership/private-office",
  },
};

export default function PrivateOfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageSchema
        path="/membership/private-office"
        name="Private Office"
        description={DESCRIPTION}
        ancestors={[{ name: "Membership", path: "/membership" }]}
        nodes={[
          serviceNode({
            path: "/membership/private-office",
            name: "Private Office Rental",
            description:
              "A private, lockable office for one to eight people in Sloan's Lake, Denver, with a professional business address, 24/7 access, conference room and flex space credits, free on-site parking and mail handling.",
            offerNames: [
              "Single Private Office",
              "2-Desk Private Office",
              "Large Team Office (4-8 Desks)",
            ],
            image: "/images/offices/single-alt.webp",
          }),
        ]}
      />
      {children}
    </>
  );
}
