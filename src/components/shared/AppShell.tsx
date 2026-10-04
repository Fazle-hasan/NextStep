import Link from "next/link";
import { Suspense } from "react";

import type { Viewer } from "@/features/auth/queries";
import { NotificationBellSlot } from "@/features/notifications/components/NotificationBellSlot";

import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { shellStrings } from "./strings";
import { UserMenu } from "./UserMenu";

// Signed-in layout: top bar, desktop sidebar, mobile bottom tabs. Navigation adapts to the viewer's roles.
export function AppShell({ viewer, children }: { viewer: Viewer; children: React.ReactNode }) {
  const name = viewer.profile.full_name ?? "";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
        <Link href="/home" className="text-lg font-semibold tracking-tight text-primary">
          {shellStrings.brand}
        </Link>
        <div className="flex items-center gap-1">
          <Suspense fallback={null}>
            <NotificationBellSlot viewerId={viewer.id} />
          </Suspense>
          <UserMenu name={name} roles={viewer.roles} />
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 border-r md:block">
          <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
            <SideNav roles={viewer.roles} />
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 pt-6 pb-24 md:px-8 md:pb-10">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
