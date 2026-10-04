"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import { MENTORSHIP_ERRORS, MENTORSHIP_GENERIC_ERROR } from "../labels";

import {
  cancelSchema,
  exceptionSchema,
  idSchema,
  mentorFeedbackSchema,
  mentorProfileSchema,
  noteSchema,
  noteUpdateSchema,
  respondSchema,
  reverifySchema,
  ruleSchema,
  toExceptionRow,
  toMentorRow,
} from "./schemas";
import { mentorStrings } from "./strings";

const { errors } = mentorStrings;
const FOREIGN_KEY_VIOLATION = "23503";
const RLS_VIOLATION = "42501";

type DbError = { message?: string; code?: string } | null;

function message(error: DbError): string {
  if (error?.code === FOREIGN_KEY_VIOLATION) return errors.profile_required;
  return dbErrorMessage(error, MENTORSHIP_ERRORS, MENTORSHIP_GENERIC_ERROR);
}

async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

function revalidateSession(sessionId: string) {
  revalidatePath("/mentor");
  revalidatePath(`/mentor/sessions/${sessionId}`);
  // The mentee's views of the same session.
  revalidatePath("/sessions");
  revalidatePath(`/sessions/${sessionId}`);
}

// Creates the mentor profile, or updates it when one exists. Creating also grants the mentor role and opens
// a verification request (database trigger). Expertise skills are replaced with the chosen set.
export async function saveMentorProfile(input: unknown): Promise<ActionResult> {
  const parsed = mentorProfileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(MENTORSHIP_ERRORS.not_authenticated ?? MENTORSHIP_GENERIC_ERROR);

  const row = toMentorRow(parsed.data);
  const { data: existing, error: readError } = await supabase
    .from("mentor_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) return fail(MENTORSHIP_GENERIC_ERROR);

  const { error } = existing
    ? await supabase.from("mentor_profiles").update(row).eq("user_id", userId)
    : await supabase.from("mentor_profiles").insert({ user_id: userId, ...row });
  if (error) {
    // The insert policy requires a finished onboarding.
    if (error.code === RLS_VIOLATION) return fail(errors.onboarding_required);
    return fail(message(error));
  }

  const wanted = [...new Set(parsed.data.skillIds)];
  const { data: current, error: skillsError } = await supabase.from("mentor_skills").select("skill_id").eq("mentor_id", userId);
  if (skillsError) return fail(MENTORSHIP_GENERIC_ERROR);
  const have = current.map((s) => s.skill_id);
  const toRemove = have.filter((id) => !wanted.includes(id));
  const toAdd = wanted.filter((id) => !have.includes(id));
  if (toRemove.length > 0) {
    const { error: removeError } = await supabase.from("mentor_skills").delete().eq("mentor_id", userId).in("skill_id", toRemove);
    if (removeError) return fail(MENTORSHIP_GENERIC_ERROR);
  }
  if (toAdd.length > 0) {
    const { error: addError } = await supabase.from("mentor_skills").insert(toAdd.map((skill_id) => ({ mentor_id: userId, skill_id })));
    if (addError) return fail(MENTORSHIP_GENERIC_ERROR);
  }

  // The new role changes the navigation; the profile shows on the mentor list.
  revalidatePath("/", "layout");
  return ok();
}

export async function requestMentorVerification(input: unknown): Promise<ActionResult> {
  const parsed = reverifySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);

  const { supabase } = await getSession();
  const { error } = await supabase.rpc("request_mentor_verification", { p_note: parsed.data.note || undefined });
  if (error) return fail(message(error));

  revalidatePath("/mentor");
  return ok();
}

// Availability ------------------------------------------------------------------

export async function addAvailabilityRule(input: unknown): Promise<ActionResult> {
  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(MENTORSHIP_ERRORS.not_authenticated ?? MENTORSHIP_GENERIC_ERROR);

  const { error } = await supabase.from("mentor_availability_rules").insert({
    mentor_id: userId,
    weekday: parsed.data.weekday,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
  });
  if (error) return fail(message(error));

  revalidatePath("/mentor");
  revalidatePath("/mentor/availability");
  return ok();
}

export async function deleteAvailabilityRule(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(MENTORSHIP_ERRORS.not_authenticated ?? MENTORSHIP_GENERIC_ERROR);

  const { error } = await supabase.from("mentor_availability_rules").delete().eq("id", parsed.data.id).eq("mentor_id", userId);
  if (error) return fail(message(error));

  revalidatePath("/mentor");
  revalidatePath("/mentor/availability");
  return ok();
}

export async function addAvailabilityException(input: unknown): Promise<ActionResult> {
  const parsed = exceptionSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(MENTORSHIP_ERRORS.not_authenticated ?? MENTORSHIP_GENERIC_ERROR);

  const { error } = await supabase
    .from("mentor_availability_exceptions")
    .insert({ mentor_id: userId, ...toExceptionRow(parsed.data) });
  if (error) return fail(message(error));

  revalidatePath("/mentor/availability");
  return ok();
}

export async function deleteAvailabilityException(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(MENTORSHIP_ERRORS.not_authenticated ?? MENTORSHIP_GENERIC_ERROR);

  const { error } = await supabase.from("mentor_availability_exceptions").delete().eq("id", parsed.data.id).eq("mentor_id", userId);
  if (error) return fail(message(error));

  revalidatePath("/mentor/availability");
  return ok();
}

// Sessions ------------------------------------------------------------------------

export async function respondToSession(input: unknown): Promise<ActionResult> {
  const parsed = respondSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);

  const { supabase } = await getSession();
  const { sessionId, accept, meetingUrl, reason } = parsed.data;
  const { error } = await supabase.rpc("respond_to_session", {
    p_session_id: sessionId,
    p_accept: accept,
    p_meeting_url: accept ? meetingUrl : undefined,
    p_reason: accept ? undefined : reason || undefined,
  });
  if (error) return fail(message(error));

  revalidateSession(sessionId);
  return ok();
}

export async function cancelSessionAsMentor(input: unknown): Promise<ActionResult> {
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);

  const { supabase } = await getSession();
  const { error } = await supabase.rpc("cancel_session", {
    p_session_id: parsed.data.sessionId,
    p_reason: parsed.data.reason || undefined,
  });
  if (error) return fail(message(error));

  revalidateSession(parsed.data.sessionId);
  return ok();
}

// Mentor feedback: a comment and recommended next steps, never a rating.
export async function submitMentorFeedback(input: unknown): Promise<ActionResult> {
  const parsed = mentorFeedbackSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);

  const { supabase } = await getSession();
  const { error } = await supabase.rpc("submit_session_feedback", {
    p_session_id: parsed.data.sessionId,
    p_comment: parsed.data.comment || undefined,
    p_next_steps: parsed.data.nextSteps || undefined,
  });
  if (error) return fail(message(error));

  revalidateSession(parsed.data.sessionId);
  return ok();
}

// Private notes (only the mentor can read them) -------------------------------------------

export async function addPrivateNote(input: unknown): Promise<ActionResult> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(MENTORSHIP_ERRORS.not_authenticated ?? MENTORSHIP_GENERIC_ERROR);

  const { error } = await supabase
    .from("mentor_private_notes")
    .insert({ session_id: parsed.data.sessionId, mentor_id: userId, body: parsed.data.body });
  if (error) return fail(message(error));

  revalidatePath(`/mentor/sessions/${parsed.data.sessionId}`);
  return ok();
}

export async function updatePrivateNote(input: unknown): Promise<ActionResult> {
  const parsed = noteUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(MENTORSHIP_ERRORS.not_authenticated ?? MENTORSHIP_GENERIC_ERROR);

  const { data, error } = await supabase
    .from("mentor_private_notes")
    .update({ body: parsed.data.body })
    .eq("id", parsed.data.noteId)
    .eq("mentor_id", userId)
    .select("session_id")
    .maybeSingle();
  if (error || !data) return fail(message(error));

  revalidatePath(`/mentor/sessions/${data.session_id}`);
  return ok();
}

export async function deletePrivateNote(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(MENTORSHIP_ERRORS.not_authenticated ?? MENTORSHIP_GENERIC_ERROR);

  const { data, error } = await supabase
    .from("mentor_private_notes")
    .delete()
    .eq("id", parsed.data.id)
    .eq("mentor_id", userId)
    .select("session_id")
    .maybeSingle();
  if (error) return fail(message(error));

  if (data) revalidatePath(`/mentor/sessions/${data.session_id}`);
  return ok();
}
