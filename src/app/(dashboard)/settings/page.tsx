import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { notificationStrings } from "@/features/notifications/strings";

const s = notificationStrings.settings;

export const metadata: Metadata = { title: s.pageTitle };

// Settings index. Notifications is the only section so far.
export default async function SettingsPage() {
  await requireViewer("/settings");

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{s.pageTitle}</h1>
        <p className="text-muted-foreground">{s.pageIntro}</p>
      </div>
      <ul className="space-y-3">
        <li>
          <Link
            href="/settings/notifications"
            className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">{s.notificationsCard}</CardTitle>
                <CardDescription>{s.notificationsCardBody}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </li>
      </ul>
    </div>
  );
}
