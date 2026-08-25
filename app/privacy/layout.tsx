import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Merritt Workspace, a coworking space in Sloan's Lake, Denver, collects, uses and protects your personal information.",
  alternates: {
    canonical: "https://merrittworkspace.net/privacy",
  },
  // Boilerplate legal pages carry no ranking intent. Keeping them out of the
  // index concentrates crawl budget on the pages that sell, while `follow`
  // still passes their internal links along.
  robots: { index: false, follow: true },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
