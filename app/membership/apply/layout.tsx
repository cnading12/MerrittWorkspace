import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply for Membership | Coworking in Sloan's Lake Denver",
  description: "Apply for a dedicated desk or private office at Merritt Workspace in Sloan's Lake, Denver. Quick application, 24/7 access, free parking. 3 min to I-25.",
  keywords: [
    "coworking membership Denver",
    "dedicated desk Denver",
    "private office rental Denver",
    "coworking space Sloan's Lake"
  ],
  openGraph: {
    title: "Apply for Membership | Merritt Workspace Denver",
    description: "Apply for a dedicated desk or private office in Sloan's Lake, Denver. 24/7 access, free parking, 3 min to I-25.",
    url: "https://merrittworkspace.net/membership/apply",
    images: [
      {
        url: "/images/dedicated-desks/room-empty.webp",
        width: 1200,
        height: 630,
        alt: "Workspace at Merritt Workspace in Sloan's Lake, Denver",
      },
    ],
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
  return children;
}
