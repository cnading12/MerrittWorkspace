import { Metadata } from "next";
import PageSchema from "@/components/seo/PageSchema";
import { serviceNode } from "@/lib/seo/schema";

const TITLE = "Meeting Room Rental Denver | $25 an Hour";
const DESCRIPTION =
  "Rent a conference room in Sloan's Lake, Denver for $25 an hour. Seats 8, with a 75-inch display, fast WiFi and free parking. Open to non-members, book online by the hour. 3 min to I-25.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "meeting room rental Denver",
    "conference room rental Denver",
    "meeting room Sloan's Lake",
    "hourly conference room Denver",
    "rent a meeting room Denver",
    "small conference room rental Denver",
  ],
  openGraph: {
    title: TITLE,
    description:
      "A conference room for 8 in Sloan's Lake, Denver — $25 an hour, 75-inch display, fast WiFi, free parking. Non-members welcome.",
    url: "https://merrittworkspace.net/member-resources/meeting-rooms",
    images: [
      {
        url: "/images/conference-room/wide.webp",
        width: 1200,
        height: 630,
        alt: "The conference room available to rent by the hour at Merritt Workspace in Sloan's Lake, Denver",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
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
      <PageSchema
        path="/member-resources/meeting-rooms"
        name="Conference Room"
        description={DESCRIPTION}
        // No /member-resources index exists, so the trail is Home > this page.
        // A breadcrumb item pointing at a URL that 404s is worse than none.
        nodes={[
          serviceNode({
            path: "/member-resources/meeting-rooms",
            name: "Conference Room Rental",
            description:
              "An eight-person conference room in Sloan's Lake, Denver with a 75-inch display, fast WiFi and free on-site parking. Bookable online by the hour, one to four hours per session, by members and non-members alike.",
            offerNames: ["Conference Room Rental"],
            image: "/images/conference-room/wide.webp",
          }),
        ]}
      />
      {children}
    </>
  );
}
