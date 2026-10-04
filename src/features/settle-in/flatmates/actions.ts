"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import { activeSchema, connectSchema, connectionIdSchema, flatmateProfileSchema, respondSchema } from "./schemas";
import { flatmateStrings } from "./strings";

const { errors } = flatmateStrings;
const FLATMATES_PATH = "/flatmates";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type DbError = { message?: string; code?: string } | null;

async function getSession(): Promise<{ supabase: Supabase; userId: string | null }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? errors.invalid;
}

function failure(error: DbError): { ok: false; error: string } {
  return fail(dbErrorMessage(error, errors.db, errors.generic));
}

function revalidate() {
  revalidatePath(FLATMATES_PATH, "layout");
}

export async function saveFlatmateProfile(input: unknown): Promise<ActionResult> {
  const parsed = flatmateProfileSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const v = parsed.data;
  const values = {
    city_id: v.cityId,
    neighbourhood_ids: [...new Set(v.neighbourhoodIds)],
    budget_min: v.budgetMin,
    budget_max: v.budgetMax,
    move_date: v.moveDate,
    preferred_gender: v.preferredGender,
    food_habit: v.foodHabit,
    smokes: v.smokes,
    ok_with_smoker: v.okWithSmoker,
    sleep_schedule: v.sleepSchedule,
    work_schedule: v.workSchedule,
    cleanliness: v.cleanliness,
    guests_policy: v.guestsPolicy,
    bio: v.bio,
    is_active: v.isActive,
  };

  // Areas must belong to the chosen city.
  if (values.neighbourhood_ids.length > 0) {
    const { data: areas, error: areasError } = await supabase
      .from("neighbourhoods")
      .select("id")
      .eq("city_id", v.cityId)
      .in("id", values.neighbourhood_ids);
    if (areasError) return failure(areasError);
    if (areas.length !== values.neighbourhood_ids.length) return fail(errors.areas);
  }

  // Update-then-insert rather than upsert: user_id is not in the column update grant.
  const { data: updated, error } = await supabase
    .from("flatmate_profiles")
    .update(values)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return failure(error);
  if (updated.length === 0) {
    const { error: insertError } = await supabase.from("flatmate_profiles").insert({ user_id: userId, ...values });
    if (insertError) return failure(insertError);
  }
  revalidate();
  return ok();
}

export async function setFlatmateActive(input: unknown): Promise<ActionResult> {
  const parsed = activeSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const { data, error } = await supabase
    .from("flatmate_profiles")
    .update({ is_active: parsed.data.isActive })
    .eq("user_id", userId)
    .select("user_id");
  if (error) return failure(error);
  if (data.length === 0) return fail(errors.noProfile);
  revalidate();
  return ok();
}

export async function deleteFlatmateProfile(): Promise<ActionResult> {
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const { error } = await supabase.from("flatmate_profiles").delete().eq("user_id", userId);
  if (error) return failure(error);
  revalidate();
  return ok();
}

export async function sendFlatmateConnection(input: unknown): Promise<ActionResult> {
  const parsed = connectSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const { error } = await supabase.rpc("send_flatmate_connection", {
    p_recipient_id: parsed.data.recipientId,
    p_message: parsed.data.message ?? undefined,
  });
  if (error) return failure(error);
  revalidate();
  return ok();
}

// Accepting opens a chat; its id is returned so the UI can link to it.
export async function respondFlatmateConnection(input: unknown): Promise<ActionResult<{ conversationId: string | null }>> {
  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const { data, error } = await supabase.rpc("respond_flatmate_connection", {
    p_connection_id: parsed.data.connectionId,
    p_accept: parsed.data.accept,
  });
  if (error) return failure(error);
  revalidate();
  return ok({ conversationId: data ?? null });
}

export async function withdrawFlatmateConnection(input: unknown): Promise<ActionResult> {
  const parsed = connectionIdSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const { error } = await supabase.rpc("withdraw_flatmate_connection", { p_connection_id: parsed.data.connectionId });
  if (error) return failure(error);
  revalidate();
  return ok();
}
