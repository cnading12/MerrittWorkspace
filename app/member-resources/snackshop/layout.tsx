import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Merritt Snackshop | Member Snacks & Drinks",
  description: "Grab snacks, drinks, and quick meals at the Merritt Workspace Snackshop — a member perk at our Sloan's Lake, Denver coworking space.",
  alternates: {
    canonical: "https://merrittworkspace.net/member-resources/snackshop",
  },
  openGraph: {
    title: "Merritt Snackshop | Merritt Workspace Denver",
    description: "Snacks, drinks, and quick meals for members at our Sloan's Lake, Denver coworking space.",
    url: "https://merrittworkspace.net/member-resources/snackshop",
    images: [
      {
        url: "/images/exterior/campus.webp",
        width: 1200,
        height: 630,
        alt: "Merritt Workspace coworking space in Sloan's Lake, Denver",
      },
    ],
  },
};

export default function SnackshopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
