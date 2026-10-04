import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { NOTIFICATION_COLUMNS, toNotificationItem } from "./mappers";
import { NOTIFICATION_PAGE_SIZE } from "./schemas";
import type { NotificationPage, NotificationPreferences } from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Unread notifications for the signed-in user (RLS limits rows to their own). Cached per request for the shell.
export const getUnreadNotificationCount = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
});

// One page of the viewer's notifications, newest first. `before` pages back in time. Null when the read fails.
export async function listNotifications(supabase: Supabase, before?: string): Promise<NotificationPage | null> {
  let query = supabase
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(NOTIFICATION_PAGE_SIZE + 1);
  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) return null;

  const rows = data ?? [];
  const pageRows = rows.slice(0, NOTIFICATION_PAGE_SIZE);
  const now = new Date();
  const last = pageRows[pageRows.length - 1];
  return {
    items: pageRows.map((row) => toNotificationItem(row, now)),
    nextBefore: rows.length > NOTIFICATION_PAGE_SIZE && last ? last.created_at : null,
  };
}

export async function getFirstNotificationPage(): Promise<NotificationPage> {
  const supabase = await createClient();
  const page = await listNotifications(supabase);
  if (!page) throw new Error("notifications_unavailable");
  return page;
}

// Defaults (email on, nothing muted) apply until the user saves preferences.
export async function getNotificationPreferences(viewerId: string): Promise<NotificationPreferences> {
  const supabase = await createClient();
  const [{ data: prefs, error }, { data: priv }] = await Promise.all([
    supabase.from("notification_preferences").select("email_enabled, email_muted_types").eq("user_id", viewerId).maybeSingle(),
    supabase.from("profile_private").select("whatsapp_opt_in").eq("user_id", viewerId).maybeSingle(),
  ]);
  if (error) throw new Error("preferences_unavailable");

  return {
    emailEnabled: prefs?.email_enabled ?? true,
    mutedTypes: prefs?.email_muted_types ?? [],
    whatsappOptIn: priv?.whatsapp_opt_in ?? false,
  };
}
