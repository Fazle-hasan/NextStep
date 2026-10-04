// job-alert-digest: creates one notification per daily saved search with new matching jobs.
// Called daily at 07:30 IST by pg_cron through pg_net with the x-cron-secret header. The matching runs in
// the database (run_job_alert_digest, service role only); dispatch-notifications then emails the digests.

import { createClient } from "npm:@supabase/supabase-js@2";

import { isCronRequest, json, requiredEnv } from "../_shared/env.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!isCronRequest(req)) return json({ error: "unauthorized" }, 401);

  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("run_job_alert_digest");
  if (error) return json({ error: "digest_failed" }, 500);
  return json({ digests: data ?? 0 });
});
