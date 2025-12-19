import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dedicated Desk $300/mo | Coworking Space Sloan's Lake Denver",
  description: "Your own dedicated desk in Denver's Sloan's Lake neighborhood. $300/month with 24/7 access, high-speed WiFi, 2hr meeting room credits, free coffee & tea. 3 min to I-25. Pet-friendly workspace.",
  keywords: [
    "dedicated desk Denver",
    "coworking space Sloan's Lake",
    "shared office space Denver",
    "hot desk Denver",
    "coworking near I-25 Denver"
  ],
  openGraph: {
    title: "Dedicated Desk $300/mo | Coworking Space Sloan's Lake Denver",
    description: "Your own permanent desk in a historic 1905 building. 24/7 access, WiFi, meeting room credits, unlimited coffee. Best value coworking in Denver.",
    url: "https://merrittworkspace.net/membership/dedicated-desk",
    images: [
      {
        url: "/images/hero/dedicated-desk.jpg",
        width: 1200,
        height: 630,
        alt: "Dedicated desk workspace at Merritt Workspace in Sloan's Lake, Denver - $300/month",
      },
    ],
  },
  alternates: {
    canonical: "https://merrittworkspace.net/membership/dedicated-desk",
  },
};

export default function DedicatedDeskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
