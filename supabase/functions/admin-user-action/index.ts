// admin-user-action: suspends or restores a user at the sign-in level.
// The app-level suspension (profiles.suspended_at, enforced by RLS, written to the audit log) is done by the
// admin_set_user_suspension RPC, called here with the CALLER's own JWT, so the database decides whether the
// caller is an admin. Only after that succeeds is the service role used, for the one thing it is needed for:
// banning or un-banning the account in Supabase Auth so the user cannot sign in.

import { createClient } from "npm:@supabase/supabase-js@2";

import { env, json, requiredEnv } from "../_shared/env.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// About 100 years: Supabase Auth has no "forever", so a long duration is used.
const BAN_DURATION = "876000h";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env("SITE_URL") ?? "http://localhost:3000",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  const cors = corsHeaders();
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, cors);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ error: "unauthorized" }, 401, cors);

  let payload: { userId?: unknown; suspend?: unknown; reason?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_body" }, 400, cors);
  }
  const userId = typeof payload.userId === "string" ? payload.userId : "";
  const suspend = payload.suspend === true;
  const reason = typeof payload.reason === "string" ? payload.reason.trim().slice(0, 500) : "";
  if (!UUID.test(userId) || typeof payload.suspend !== "boolean") return json({ error: "invalid_body" }, 400, cors);

  const url = requiredEnv("SUPABASE_URL");

  // 1. As the caller: the RPC checks admin rights, refuses self/admin targets and writes the audit log.
  const asCaller = createClient(url, requiredEnv("SUPABASE_ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: rpcError } = await asCaller.rpc("admin_set_user_suspension", {
    p_user_id: userId,
    p_suspend: suspend,
    p_reason: reason || null,
  });
  if (rpcError) {
    const known = ["admin_only", "cannot_suspend_self", "cannot_suspend_admin", "reason_required", "user_not_found"];
    const code = known.includes(rpcError.message) ? rpcError.message : "suspension_failed";
    return json({ error: code }, code === "admin_only" ? 403 : 400, cors);
  }

  // 2. With the service role: ban or un-ban sign-in.
  const admin = createClient(url, requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: suspend ? BAN_DURATION : "none",
  });
  if (banError) {
    // The app-level suspension already holds; report that sign-in could not be blocked.
    return json({ ok: true, authBan: false }, 200, cors);
  }
  return json({ ok: true, authBan: true }, 200, cors);
});
