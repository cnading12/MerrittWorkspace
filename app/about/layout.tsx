import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us | Historic 1905 Church Coworking Space Denver",
  description: "Merritt Workspace: A beautifully restored 1905 church transformed into Denver's most distinctive coworking space. Located in Sloan's Lake, 3 min to I-25. Community-focused workspace.",
  keywords: [
    "Sloan's Lake office space",
    "historic coworking Denver",
    "West Denver coworking",
    "unique workspace Denver",
    "coworking near I-25 Denver"
  ],
  openGraph: {
    title: "About Merritt Workspace | Historic 1905 Church Coworking",
    description: "A 1905 church transformed into Denver's most distinctive coworking space. Located in Sloan's Lake, where history meets modern work culture.",
    url: "https://merrittworkspace.net/about",
    images: [
      {
        url: "/images/flex-space/exterior.webp",
        width: 1200,
        height: 630,
        alt: "The historic Merritt Church building, now Merritt Workspace in Sloan's Lake, Denver",
      },
    ],
  },
  alternates: {
    canonical: "https://merrittworkspace.net/about",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
