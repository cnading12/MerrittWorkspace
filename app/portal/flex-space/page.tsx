import { redirect } from 'next/navigation';

// Flex space booking moved out of the portal to
// /member-resources/flex-space, where the room is described in full for
// members and prospects alike and the booking widget sits underneath.
//
// This route stays as a permanent redirect: it is linked from booking
// confirmation emails, the Stripe cancel URL, and members' own bookmarks.
export default function PortalFlexSpaceRedirect() {
  redirect('/member-resources/flex-space');
}
