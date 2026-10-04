import type { Metadata } from "next";
import Link from "next/link";

import { requireViewer } from "@/features/auth/queries";
import { PreferencesForm } from "@/features/notifications/components/PreferencesForm";
import { getNotificationPreferences } from "@/features/notifications/queries";
import { notificationStrings } from "@/features/notifications/strings";

const s = notificationStrings.settings;

export const metadata: Metadata = { title: s.title };

export default async function NotificationSettingsPage() {
  const viewer = await requireViewer("/settings/notifications");
  const preferences = await getNotificationPreferences(viewer.id);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-2">
        <Link
          href="/notifications"
          className="rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          ← {s.back}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="text-muted-foreground">{s.intro}</p>
      </div>
      <PreferencesForm initial={preferences} />
    </div>
  );
}
