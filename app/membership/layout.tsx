import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coworking Memberships | Dedicated Desks & Private Offices",
  description: "Find your perfect workspace in Sloan's Lake, Denver. Dedicated desks from $200/mo, private offices from $500/mo. 24/7 access, meeting rooms, free coffee. Compare all membership options.",
  keywords: [
    "dedicated desk Denver",
    "private office rental Denver",
    "coworking membership Denver",
    "Sloan's Lake office space",
    "coworking near I-25 Denver"
  ],
  openGraph: {
    title: "Coworking Memberships | Merritt Workspace Denver",
    description: "Dedicated desks from $200/mo, private offices from $500/mo. 24/7 access, 3 min to I-25. Find your perfect workspace in Sloan's Lake, Denver.",
    url: "https://merrittworkspace.net/membership",
    images: [
      {
        url: "/images/hero/dedicated-desk.webp",
        width: 1200,
        height: 630,
        alt: "Dedicated desk workspace at Merritt Workspace in Sloan's Lake, Denver",
      },
    ],
  },
  alternates: {
    canonical: "https://merrittworkspace.net/membership",
  },
};

export default function MembershipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
