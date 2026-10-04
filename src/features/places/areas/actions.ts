"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import { tipIdSchema, tipSchema, voteSchema } from "./schemas";
import { areaStrings } from "./strings";

const { errors } = areaStrings;

type Supabase = Awaited<ReturnType<typeof createClient>>;
type DbError = { message?: string; code?: string } | null;

// These pages are public, so every action checks for a signed-in caller itself.
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
  revalidatePath("/areas", "layout");
}

export async function postAreaTip(input: unknown): Promise<ActionResult> {
  const parsed = tipSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const { error } = await supabase
    .from("area_tips")
    .insert({ neighbourhood_id: parsed.data.neighbourhoodId, author_id: userId, body: parsed.data.body });
  if (error) {
    // The trigger names the reason; a bare RLS refusal (42501) means the same thing here.
    if (error.code === "42501" && error.message !== "verified_buddy_required") return fail(errors.buddyRequired);
    return failure(error);
  }

  revalidate();
  return ok();
}

// Adds or removes the caller's upvote on a tip.
export async function setTipUpvote(input: unknown): Promise<ActionResult> {
  const parsed = voteSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  if (parsed.data.upvote) {
    const { error } = await supabase.from("area_tip_votes").insert({ tip_id: parsed.data.tipId, user_id: userId });
    // 23505: already upvoted, which is the state the caller asked for.
    if (error && error.code !== "23505") return failure(error);
  } else {
    const { error } = await supabase.from("area_tip_votes").delete().eq("tip_id", parsed.data.tipId).eq("user_id", userId);
    if (error) return failure(error);
  }

  revalidate();
  return ok();
}

export async function deleteAreaTip(input: unknown): Promise<ActionResult> {
  const parsed = tipIdSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const { error } = await supabase.rpc("delete_area_tip", { p_tip_id: parsed.data.tipId });
  if (error) return failure(error);

  revalidate();
  return ok();
}
