"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import { buddyProfileSchema, offerHelpSchema, reverifySchema, toBuddyRow, withdrawOfferSchema } from "./schemas";
import { buddyStrings } from "./strings";

const { errors } = buddyStrings;
const UNIQUE_VIOLATION = "23505";

async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

// Creates the buddy profile, or updates it when one exists. Creating also opens a verification request (database trigger).
export async function saveBuddyProfile(input: unknown): Promise<ActionResult> {
  const parsed = buddyProfileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.not_authenticated);

  const row = toBuddyRow(parsed.data);
  const { data: existing, error: readError } = await supabase
    .from("buddy_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) return fail(errors.generic);

  const { error } = existing
    ? await supabase.from("buddy_profiles").update(row).eq("user_id", userId)
    : await supabase.from("buddy_profiles").insert({ user_id: userId, ...row });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return fail(errors.profile_exists);
    // The insert policy requires a finished onboarding.
    if (error.code === "42501") return fail(errors.onboarding_required);
    return fail(dbErrorMessage(error, errors, errors.generic));
  }

  // The new role changes the navigation.
  revalidatePath("/", "layout");
  return ok();
}

export async function offerHelp(input: unknown): Promise<ActionResult> {
  const parsed = offerHelpSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);

  const { supabase } = await getSession();
  const { error } = await supabase.rpc("offer_help", {
    p_request_id: parsed.data.requestId,
    p_message: parsed.data.message || undefined,
  });
  if (error) return fail(dbErrorMessage(error, errors, errors.generic));

  revalidatePath("/buddy");
  return ok();
}

export async function withdrawOffer(input: unknown): Promise<ActionResult> {
  const parsed = withdrawOfferSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);

  const { supabase } = await getSession();
  const { error } = await supabase.rpc("withdraw_offer", { p_offer_id: parsed.data.offerId });
  if (error) return fail(dbErrorMessage(error, errors, errors.generic));

  revalidatePath("/buddy");
  return ok();
}

export async function requestBuddyVerification(input: unknown): Promise<ActionResult> {
  const parsed = reverifySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);

  const { supabase } = await getSession();
  const { error } = await supabase.rpc("request_buddy_verification", { p_note: parsed.data.note || undefined });
  if (error) return fail(dbErrorMessage(error, errors, errors.generic));

  revalidatePath("/buddy");
  return ok();
}
