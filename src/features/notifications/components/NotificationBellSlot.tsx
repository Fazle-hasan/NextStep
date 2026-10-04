import { getUnreadNotificationCount } from "../queries";

import { NotificationBell } from "./NotificationBell";

// Server part of the bell: reads the unread count, then hands over to the live client component.
// Rendered inside <Suspense> by the app shell so a slow count never delays the page.
export async function NotificationBellSlot({ viewerId }: { viewerId: string }) {
  const initialCount = await getUnreadNotificationCount();
  return <NotificationBell viewerId={viewerId} initialCount={initialCount} />;
}
