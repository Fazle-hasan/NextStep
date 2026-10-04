import type { Metadata } from "next";
import Link from "next/link";

import { requireViewer } from "@/features/auth/queries";
import { EmptyState } from "@/features/jobs/search/components/EmptyState";
import { NotificationList } from "@/features/notifications/components/NotificationList";
import { getFirstNotificationPage } from "@/features/notifications/queries";
import { notificationStrings as s } from "@/features/notifications/strings";

export const metadata: Metadata = { title: s.title };

export default async function NotificationsPage() {
  await requireViewer("/notifications");
  const page = await getFirstNotificationPage();

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        <Link
          href="/settings/notifications"
          className="rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {s.settingsLink}
        </Link>
      </div>
      {page.items.length === 0 ? <EmptyState title={s.emptyTitle} body={s.emptyBody} /> : <NotificationList initialPage={page} />}
    </div>
  );
}
