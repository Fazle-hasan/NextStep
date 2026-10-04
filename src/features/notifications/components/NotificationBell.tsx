"use client";

import { BellIcon } from "lucide-react";
import Link from "next/link";

import { useNotificationBell } from "../hooks/useNotificationBell";
import { notificationStrings as s } from "../strings";

type Props = { viewerId: string; initialCount: number };

// Bell in the app header with a live unread badge. Opens the notifications page.
export function NotificationBell({ viewerId, initialCount }: Props) {
  const count = useNotificationBell(viewerId, initialCount);

  return (
    <Link
      href="/notifications"
      aria-label={s.bellLabel(count)}
      className="relative flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <BellIcon className="size-5" aria-hidden="true" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold text-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
