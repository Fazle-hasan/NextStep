"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import { jobReviewSchema, reviewSchema } from "./schemas";
import { adminStrings } from "./strings";

// Both RPCs check the admin role in the database and write the audit log.

export async function reviewVerification(input: unknown): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? adminStrings.errors.generic);

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_verification", {
    p_request_id: parsed.data.id,
    p_approve: parsed.data.approve,
    p_reason: parsed.data.reason || undefined,
  });
  if (error) return fail(dbErrorMessage(error, adminStrings.errors, adminStrings.errors.generic));

  revalidatePath("/admin", "layout");
  return ok();
}

export async function reviewJob(input: unknown): Promise<ActionResult> {
  const parsed = jobReviewSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? adminStrings.errors.generic);

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_job", {
    p_job_id: parsed.data.id,
    p_approve: parsed.data.approve,
    p_reason: parsed.data.reason || undefined,
  });
  if (error) return fail(dbErrorMessage(error, adminStrings.errors, adminStrings.errors.generic));

  revalidatePath("/admin", "layout");
  revalidatePath("/jobs");
  return ok();
}
