import { Metadata } from "next";
import BreadcrumbSchema from "@/components/seo/BreadcrumbSchema";
import MeetingRoomSchema from "@/components/seo/MeetingRoomSchema";

export const metadata: Metadata = {
  title: "Meeting Room Rental Denver | $25 an Hour",
  description: "Rent a professional conference room at Merritt Workspace in Sloan's Lake, Denver. Book by the hour with HD display, fast WiFi, and free parking. 3 min to I-25.",
  keywords: [
    "meeting room rental Denver",
    "conference room rental Denver",
    "meeting room Sloan's Lake",
    "hourly conference room Denver",
    "coworking near I-25 Denver"
  ],
  openGraph: {
    title: "Meeting & Conference Room Rental | Merritt Workspace Denver",
    description: "Book a professional conference room by the hour in Sloan's Lake, Denver. HD display, fast WiFi, free parking, 3 min to I-25.",
    url: "https://merrittworkspace.net/member-resources/meeting-rooms",
    images: [
      {
        url: "/images/conference-room/wide.webp",
        width: 1200,
        height: 630,
        alt: "Professional conference room available to rent at Merritt Workspace in Sloan's Lake, Denver",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Meeting & Conference Room Rental | Merritt Workspace Denver",
    description:
      "A conference room for 8 in Sloan's Lake, Denver — $25 an hour, 75-inch display, fast WiFi, free parking.",
    images: ["/images/conference-room/wide.webp"],
  },
  alternates: {
    canonical: "https://merrittworkspace.net/member-resources/meeting-rooms",
  },
};

export default function MeetingRoomsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MeetingRoomSchema />
      <BreadcrumbSchema
        trail={[
          { name: "Member resources", path: "/member-resources/meeting-rooms" },
          { name: "Conference room", path: "/member-resources/meeting-rooms" },
        ]}
      />
      {children}
    </>
  );
}
