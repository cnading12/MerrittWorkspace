import { Metadata } from "next";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";

export const metadata: Metadata = {
  title: "About Us | Sloan's Lake Coworking, Denver",
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
  twitter: {
    card: "summary_large_image",
    title: "About Merritt Workspace | Independent Coworking in Denver",
    description:
      "A locally owned coworking space in Sloan's Lake, Denver, next to a restored 1905 hall on the same lawn.",
    images: ["/images/flex-space/exterior.webp"],
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
  return (
    <>
      <BreadcrumbSchema trail={[{ name: "About", path: "/about" }]} />
      {children}
    </>
  );
}
