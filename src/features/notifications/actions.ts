"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import { listNotifications } from "./queries";
import { loadMoreSchema, markReadSchema, notificationIdSchema, preferencesSchema } from "./schemas";
import { notificationStrings } from "./strings";
import type { NotificationPage } from "./types";

const { errors } = notificationStrings;

async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

// The bell lives in the shell on every page, so refresh the layout after a change.
function revalidateShell() {
  revalidatePath("/", "layout");
}

// Marks the given notifications (or all of them) as read. Returns how many are still unread.
export async function markNotificationsRead(input: unknown): Promise<ActionResult<{ unread: number }>> {
  const parsed = markReadSchema.safeParse(input ?? {});
  if (!parsed.success) return fail(errors.generic);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.signedOut);

  const { error } = await supabase.rpc("mark_notifications_read", { p_ids: parsed.data.ids });
  if (error) return fail(errors.generic);

  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  revalidateShell();
  return ok({ unread: count ?? 0 });
}

export async function deleteNotification(input: unknown): Promise<ActionResult> {
  const parsed = notificationIdSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.signedOut);

  // RLS only lets a user delete their own notifications.
  const { error } = await supabase.from("notifications").delete().eq("id", parsed.data.id);
  if (error) return fail(errors.generic);

  revalidateShell();
  return ok();
}

export async function loadMoreNotifications(input: unknown): Promise<ActionResult<NotificationPage>> {
  const parsed = loadMoreSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.signedOut);

  const page = await listNotifications(supabase, parsed.data.before);
  if (!page) return fail(errors.generic);
  return ok(page);
}

// Used by the bell when the tab regains focus.
export async function fetchUnreadNotificationCount(): Promise<ActionResult<{ unread: number }>> {
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.signedOut);

  const { count, error } = await supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  if (error) return fail(errors.generic);
  return ok({ unread: count ?? 0 });
}

export async function saveNotificationPreferences(input: unknown): Promise<ActionResult> {
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.signedOut);

  const { emailEnabled, mutedTypes, whatsappOptIn } = parsed.data;

  // Insert if missing, else update (the update grant does not include user_id, so no upsert).
  const { data: existing, error: readError } = await supabase
    .from("notification_preferences")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) return fail(errors.generic);

  const { error: prefsError } = existing
    ? await supabase
        .from("notification_preferences")
        .update({ email_enabled: emailEnabled, email_muted_types: mutedTypes })
        .eq("user_id", userId)
    : await supabase
        .from("notification_preferences")
        .insert({ user_id: userId, email_enabled: emailEnabled, email_muted_types: mutedTypes });
  if (prefsError) return fail(errors.generic);

  const { error: privError } = await supabase.from("profile_private").update({ whatsapp_opt_in: whatsappOptIn }).eq("user_id", userId);
  if (privError) return fail(errors.generic);

  revalidatePath("/settings/notifications");
  return ok();
}
