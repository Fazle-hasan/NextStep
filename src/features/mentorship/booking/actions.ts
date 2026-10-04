"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import { SLOT_WINDOW_DAYS, bookSessionSchema, cancelSessionSchema, feedbackSchema, slotsSchema } from "./schemas";
import { slotWindow } from "./slots";
import { bookingStrings } from "./strings";
import type { Slot } from "./types";

const { errors } = bookingStrings;

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

function revalidateSessions(sessionId?: string) {
  revalidatePath("/sessions");
  if (sessionId) revalidatePath(`/sessions/${sessionId}`);
  revalidatePath("/mentor", "layout");
}

// Free times for one page of the slot picker. The database only returns slots of a listed mentor.
export async function loadMentorSlots(input: unknown): Promise<ActionResult<Slot[]>> {
  const parsed = slotsSchema.safeParse(input);
  if (!parsed.success) return fail(errors.slots);
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const { from, to } = slotWindow(parsed.data.page, SLOT_WINDOW_DAYS);
  const { data, error } = await supabase.rpc("get_mentor_slots", {
    p_mentor_id: parsed.data.mentorId,
    p_from: from,
    p_to: to,
  });
  if (error) return fail(errors.slots);
  return ok(data.map((row) => ({ startsAt: row.starts_at, endsAt: row.ends_at })));
}

// Requests a session. The database re-checks the slot, the mentor, blocks and the 2-session limit.
export async function bookSession(input: unknown): Promise<ActionResult<{ sessionId: string }>> {
  const parsed = bookSessionSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const v = parsed.data;
  const { data, error } = await supabase.rpc("book_session", {
    p_mentor_id: v.mentorId,
    p_session_type: v.sessionType,
    p_starts_at: new Date(v.startsAt).toISOString(),
    p_goal_note: v.goalNote ?? undefined,
  });
  if (error) return failure(error);

  revalidateSessions();
  revalidatePath(`/mentors/${v.mentorId}`);
  return ok({ sessionId: data });
}

export async function cancelSession(input: unknown): Promise<ActionResult> {
  const parsed = cancelSessionSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const { error } = await supabase.rpc("cancel_session", {
    p_session_id: parsed.data.sessionId,
    p_reason: parsed.data.reason ?? undefined,
  });
  if (error) return failure(error);

  revalidateSessions(parsed.data.sessionId);
  return ok();
}

// The mentee's rating and comment, once the session has ended.
export async function submitFeedback(input: unknown): Promise<ActionResult> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const { error } = await supabase.rpc("submit_session_feedback", {
    p_session_id: parsed.data.sessionId,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment ?? undefined,
  });
  if (error) return failure(error);

  revalidateSessions(parsed.data.sessionId);
  revalidatePath("/mentors", "layout");
  return ok();
}
