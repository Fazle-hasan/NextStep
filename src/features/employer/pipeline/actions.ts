"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { BUCKETS, CV_SIGNED_URL_SECONDS } from "@/lib/supabase/storage";

import { addNoteSchema, cancelSlotSchema, cvRequestSchema, deleteNoteSchema, moveApplicantSchema, proposeSlotSchema } from "./schemas";
import { pipelineDbErrors, pipelineStrings } from "./strings";

const { errors } = pipelineStrings;

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? errors.invalidInput;
}

function revalidateEmployer() {
  revalidatePath("/employer", "layout");
}

// Moves an applicant to another stage. The database checks company membership and writes the history.
export async function moveApplicant(input: unknown): Promise<ActionResult> {
  const parsed = moveApplicantSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_application_status", {
    p_application_id: parsed.data.applicationId,
    p_status: parsed.data.status,
    p_note: parsed.data.note,
  });
  if (error) return fail(dbErrorMessage(error, pipelineDbErrors, errors.generic));

  revalidateEmployer();
  return ok();
}

export async function addApplicantNote(input: unknown): Promise<ActionResult> {
  const parsed = addNoteSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return fail(errors.not_company_member);

  const { error } = await supabase
    .from("application_notes")
    .insert({ application_id: parsed.data.applicationId, author_id: userId, body: parsed.data.body });
  if (error) return fail(error.code === "42501" ? errors.not_company_member : errors.generic);

  revalidateEmployer();
  return ok();
}

export async function deleteApplicantNote(input: unknown): Promise<ActionResult> {
  const parsed = deleteNoteSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  // RLS only lets the author delete their own note; no row back means it was not theirs.
  const { data, error } = await supabase.from("application_notes").delete().eq("id", parsed.data.noteId).select("id");
  if (error || data.length === 0) return fail(errors.generic);

  revalidateEmployer();
  return ok();
}

export async function proposeInterviewSlot(input: unknown): Promise<ActionResult> {
  const parsed = proposeSlotSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return fail(errors.not_company_member);

  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = new Date(startsAt.getTime() + parsed.data.durationMinutes * 60_000);
  const { error } = await supabase.from("interview_slots").insert({
    application_id: parsed.data.applicationId,
    proposed_by: userId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    location_or_link: parsed.data.locationOrLink ?? null,
  });
  if (error) {
    return fail(error.code === "42501" ? errors.not_company_member : dbErrorMessage(error, pipelineDbErrors, errors.generic));
  }

  revalidateEmployer();
  return ok();
}

export async function cancelInterviewSlot(input: unknown): Promise<ActionResult> {
  const parsed = cancelSlotSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_interview_slot", { p_slot_id: parsed.data.slotId });
  if (error) return fail(dbErrorMessage(error, pipelineDbErrors, errors.generic));

  revalidateEmployer();
  return ok();
}

// Short-lived link to the applicant's CV, created with the employer's own session.
// Storage RLS allows it only while the CV is attached to a live application to one of their jobs.
export async function getCvSignedUrl(input: unknown): Promise<ActionResult<{ url: string }>> {
  const parsed = cvRequestSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { data: application } = await supabase
    .from("job_applications")
    .select("cv_id, job_id")
    .eq("id", parsed.data.applicationId)
    .maybeSingle();
  if (!application) return fail(errors.not_company_member);

  const { data: job } = await supabase.from("jobs").select("company_id").eq("id", application.job_id).maybeSingle();
  const { data: isMember } = job
    ? await supabase.rpc("is_company_member", { p_company_id: job.company_id })
    : { data: false };
  if (!isMember) return fail(errors.not_company_member);

  const { data: cv } = await supabase.from("cvs").select("storage_path").eq("id", application.cv_id).maybeSingle();
  if (!cv) return fail(pipelineStrings.cvUnavailable);

  const { data: signed, error } = await supabase.storage.from(BUCKETS.cvs).createSignedUrl(cv.storage_path, CV_SIGNED_URL_SECONDS);
  if (error || !signed?.signedUrl) return fail(pipelineStrings.cvUnavailable);

  return ok({ url: signed.signedUrl });
}
