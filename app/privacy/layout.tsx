import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Merritt Workspace, a coworking space in Sloan's Lake, Denver. How we collect, use, and protect your personal information.",
  alternates: {
    canonical: "https://merrittworkspace.net/privacy",
  },
  openGraph: {
    title: "Privacy Policy | Merritt Workspace Denver",
    description: "How Merritt Workspace collects, uses, and protects your personal information.",
    url: "https://merrittworkspace.net/privacy",
    images: [
      {
        url: "/images/hero/outside-hero.webp",
        width: 1200,
        height: 630,
        alt: "Merritt Workspace coworking space in Sloan's Lake, Denver",
      },
    ],
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
