import { Metadata } from "next";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import MembershipSchema from "@/components/seo/MembershipSchema";

export const metadata: Metadata = {
  title: "Private Office Rental Denver | $500/mo",
  description: "Private lockable offices in Sloan's Lake, Denver from $500/mo. 1-8 person offices with professional business address, 24/7 access, conference room credits. 3 min to I-25. Tour today!",
  keywords: [
    "private office rental Denver",
    "office space Sloan's Lake",
    "small office rental Denver",
    "team office Denver",
    "coworking near I-25 Denver"
  ],
  openGraph: {
    title: "Private Office Rental Denver | From $500/mo | Sloan's Lake",
    description: "Lockable private offices for 1-8 people. Business address, 24/7 access, conference room. Historic 1905 building in Denver's Sloan's Lake neighborhood.",
    url: "https://merrittworkspace.net/membership/private-office",
    images: [
      {
        url: "/images/offices/single-alt.webp",
        width: 1200,
        height: 630,
        alt: "Private office space at Merritt Workspace in Sloan's Lake, Denver",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Private Office Rental Denver | Merritt Workspace",
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
      <MembershipSchema
        planIds={["private_office_single", "private_office_double", "private_office_large"]}
      />
      <BreadcrumbSchema
        trail={[
          { name: "Membership", path: "/membership" },
          { name: "Private offices", path: "/membership/private-office" },
        ]}
      />
      {children}
    </>
  );
}
