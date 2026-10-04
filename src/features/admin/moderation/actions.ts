"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import { resolveReportSchema } from "./schemas";
import { moderationStrings } from "./strings";

const { errors } = moderationStrings;

// The RPC checks the admin role, applies the action (hide, warn, suspend) and writes the audit log.
export async function resolveReport(input: unknown): Promise<ActionResult> {
  const parsed = resolveReportSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.generic);

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_resolve_report", {
    p_report_id: parsed.data.reportId,
    p_action: parsed.data.action,
    p_note: parsed.data.note || undefined,
  });
  if (error) return fail(dbErrorMessage(error, errors, errors.generic));

  revalidatePath("/admin", "layout");
  return ok();
}
