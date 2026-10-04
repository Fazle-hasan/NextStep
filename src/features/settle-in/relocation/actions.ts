"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import {
  closeRequestSchema,
  rateBuddySchema,
  requestFormSchema,
  respondOfferSchema,
  toRequestRow,
  updateRequestSchema,
} from "./schemas";
import { relocationStrings } from "./strings";

const { errors } = relocationStrings;

async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

function revalidateSettleIn() {
  revalidatePath("/settle-in", "layout");
  revalidatePath("/buddy");
}

export async function createRelocationRequest(input: unknown): Promise<ActionResult<{ requestId: string }>> {
  const parsed = requestFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.not_authenticated);

  // A new request has no saved pin to keep.
  const values = parsed.data.pinAction === "keep" ? { ...parsed.data, pinAction: "clear" as const } : parsed.data;
  const { data, error } = await supabase
    .from("relocation_requests")
    .insert({ user_id: userId, ...toRequestRow(values) })
    .select("id")
    .single();
  if (error || !data) return fail(dbErrorMessage(error, errors, errors.generic));

  revalidateSettleIn();
  return ok({ requestId: data.id });
}

export async function updateRelocationRequest(input: unknown): Promise<ActionResult> {
  const parsed = updateRequestSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.not_authenticated);

  // RLS only lets the owner update a request that is still open.
  const { data, error } = await supabase
    .from("relocation_requests")
    .update(toRequestRow(parsed.data.values))
    .eq("id", parsed.data.requestId)
    .eq("user_id", userId)
    .select("id");
  if (error) return fail(dbErrorMessage(error, errors, errors.generic));
  if (data.length === 0) return fail(errors.request_not_found);

  revalidateSettleIn();
  return ok();
}

export async function closeRelocationRequest(input: unknown): Promise<ActionResult> {
  const parsed = closeRequestSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);

  const { supabase } = await getSession();
  const { error } = await supabase.rpc("close_relocation_request", {
    p_request_id: parsed.data.requestId,
    p_cancel: parsed.data.cancel,
  });
  if (error) return fail(dbErrorMessage(error, errors, errors.generic));

  revalidateSettleIn();
  return ok();
}

// Accepting opens a chat with the buddy and returns its id.
export async function respondToOffer(input: unknown): Promise<ActionResult<{ conversationId: string | null }>> {
  const parsed = respondOfferSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);

  const { supabase } = await getSession();
  const { data, error } = await supabase.rpc("respond_to_offer", {
    p_offer_id: parsed.data.offerId,
    p_accept: parsed.data.accept,
  });
  if (error) return fail(dbErrorMessage(error, errors, errors.generic));

  revalidateSettleIn();
  revalidatePath("/messages");
  return ok({ conversationId: data ?? null });
}

export async function rateBuddy(input: unknown): Promise<ActionResult> {
  const parsed = rateBuddySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);

  const { supabase } = await getSession();
  const { requestId, buddyId, rating, comment } = parsed.data;
  const { error } = await supabase.rpc("rate_buddy", {
    p_request_id: requestId,
    p_buddy_id: buddyId,
    p_rating: rating,
    p_comment: comment || undefined,
  });
  if (error) return fail(dbErrorMessage(error, errors, errors.generic));

  revalidateSettleIn();
  return ok();
}
