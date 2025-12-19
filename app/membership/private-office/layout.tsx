import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Private Office Rental Denver | From $500/mo | Sloan's Lake",
  description: "Private lockable offices in Sloan's Lake, Denver from $500/mo. 1-8 person offices with professional business address, 24/7 access, meeting room credits. 3 min to I-25. Tour today!",
  keywords: [
    "private office rental Denver",
    "office space Sloan's Lake",
    "small office rental Denver",
    "team office Denver",
    "coworking near I-25 Denver"
  ],
  openGraph: {
    title: "Private Office Rental Denver | From $500/mo | Sloan's Lake",
    description: "Lockable private offices for 1-8 people. Business address, 24/7 access, meeting rooms. Historic 1905 building in Denver's Sloan's Lake neighborhood.",
    url: "https://merrittworkspace.net/membership/private-office",
    images: [
      {
        url: "/images/private-offices/single.png",
        width: 1200,
        height: 630,
        alt: "Private office space at Merritt Workspace in Sloan's Lake, Denver",
      },
    ],
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
  return children;
}
