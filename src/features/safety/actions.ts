"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import { blockSchema, reportSchema } from "./schemas";
import { safetyStrings } from "./strings";

const { errors } = safetyStrings;

async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

type DbError = { code?: string; message?: string };

function reportErrorMessage(error: DbError): string {
  if (error.message === "rate_limit_exceeded") return errors.rateLimited;
  if (error.message === "cannot_report_self") return errors.self;
  if (error.code === "23505") return errors.duplicate;
  return errors.generic;
}

export async function reportContent(input: unknown): Promise<ActionResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return fail(errors.signedOut);

  const { targetType, targetId, reason, details } = parsed.data;
  const { error } = await supabase.from("reports").insert({
    reporter_id: userId,
    target_type: targetType,
    target_id: targetId,
    reason,
    details: details || null,
  });
  if (error) return fail(reportErrorMessage(error));
  return ok();
}

export async function blockUser(input: unknown): Promise<ActionResult> {
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return fail(errors.signedOut);
  if (userId === parsed.data.userId) return fail(errors.blockSelf);

  const { error } = await supabase.from("blocks").insert({ blocker_id: userId, blocked_id: parsed.data.userId });
  // Already blocked is fine.
  if (error && error.code !== "23505") return fail(errors.generic);

  revalidatePath("/", "layout");
  return ok();
}

export async function unblockUser(input: unknown): Promise<ActionResult> {
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return fail(errors.signedOut);

  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", userId)
    .eq("blocked_id", parsed.data.userId);
  if (error) return fail(errors.generic);

  revalidatePath("/", "layout");
  return ok();
}
