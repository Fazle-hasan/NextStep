// dispatch-notifications: sends the pending notification emails (D-016).
// Called every minute by pg_cron through pg_net with the x-cron-secret header. Uses the service role,
// so it must never be reachable without the secret.

import { createClient } from "npm:@supabase/supabase-js@2";

import { getEmailSender } from "../_shared/email.ts";
import { env, isCronRequest, json, requiredEnv } from "../_shared/env.ts";
import { isDeliverableAddress, renderNotificationEmail } from "../_shared/templates.ts";
import { getWhatsAppSender, WHATSAPP_TYPES } from "../_shared/whatsapp.ts";

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 3;

type PendingNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  email_attempts: number;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!isCronRequest(req)) return json({ error: "unauthorized" }, 401);

  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const siteUrl = env("SITE_URL") ?? "http://localhost:3000";
  const sender = getEmailSender();
  const whatsapp = getWhatsAppSender();

  const { data: pending, error } = await supabase
    .from("notifications")
    .select("id, user_id, type, title, body, link, email_attempts")
    .eq("email_status", "pending")
    .lt("email_attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);
  if (error) return json({ error: "query_failed" }, 500);

  const rows = (pending ?? []) as PendingNotification[];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    // Email is not configured: do not keep the queue growing.
    if (!sender) {
      await supabase.from("notifications").update({ email_status: "failed", email_attempts: MAX_ATTEMPTS }).eq("id", row.id);
      failed += 1;
      continue;
    }

    const { data: userData } = await supabase.auth.admin.getUserById(row.user_id);
    const email = userData?.user?.email ?? null;
    if (!isDeliverableAddress(email)) {
      await supabase.from("notifications").update({ email_status: "skipped" }).eq("id", row.id);
      skipped += 1;
      continue;
    }

    const message = renderNotificationEmail({ title: row.title, body: row.body, link: row.link, siteUrl });
    const result = await sender.send({ to: email as string, ...message });
    const attempts = row.email_attempts + 1;

    if (result.ok) {
      await supabase
        .from("notifications")
        .update({ email_status: "sent", email_attempts: attempts, emailed_at: new Date().toISOString() })
        .eq("id", row.id);
      sent += 1;
    } else {
      await supabase
        .from("notifications")
        .update({ email_status: attempts >= MAX_ATTEMPTS ? "failed" : "pending", email_attempts: attempts })
        .eq("id", row.id);
      failed += 1;
      console.error(JSON.stringify({ notification: row.id, error: result.error, attempts }));
    }

    // WhatsApp stub (D-011): only for users who opted in, and only for the event types in the spec.
    if (WHATSAPP_TYPES.has(row.type)) {
      const { data: priv } = await supabase
        .from("profile_private")
        .select("whatsapp_opt_in")
        .eq("user_id", row.user_id)
        .maybeSingle();
      if (priv?.whatsapp_opt_in) await whatsapp.send({ toUserId: row.user_id, type: row.type, title: row.title });
    }
  }

  return json({ processed: rows.length, sent, skipped, failed, email_configured: sender !== null });
});
