"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

import { fetchUnreadNotificationCount } from "../actions";

type InsertedRow = { title?: unknown };

// Live unread count for the bell. Starts from the server's count, goes up on each new notification
// (the subscription is filtered by user_id and RLS on public.notifications decides delivery),
// and re-syncs when the tab regains focus or the server sends a new count.
export function useNotificationBell(viewerId: string, initialCount: number): number {
  const [count, setCount] = useState(initialCount);
  const [syncedCount, setSyncedCount] = useState(initialCount);

  // The server re-rendered the shell with a fresh count (e.g. after "mark all as read").
  if (syncedCount !== initialCount) {
    setSyncedCount(initialCount);
    setCount(initialCount);
  }

  const handleInsert = useEffectEvent((row: InsertedRow) => {
    setCount((current) => current + 1);
    if (typeof row.title === "string" && row.title) toast(row.title);
  });

  const refresh = useEffectEvent(async () => {
    const result = await fetchUnreadNotificationCount();
    if (result.ok) setCount(result.data.unread);
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    // Make sure the realtime socket carries the user's session token before subscribing.
    void supabase.realtime.setAuth().then(() => {
      if (cancelled) return;
      channel = supabase
        .channel(`notifications:${viewerId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${viewerId}` },
          (payload) => handleInsert(payload.new as InsertedRow),
        )
        .subscribe();
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [viewerId]);

  return count;
}
