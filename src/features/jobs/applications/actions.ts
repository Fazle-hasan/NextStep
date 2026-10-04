"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import {
  addAffiliationSchema,
  affiliationIdSchema,
  applicationIdSchema,
  applySchema,
  createReferralSchema,
  referralIdSchema,
  slotSchema,
} from "./schemas";
import { applicationsStrings, applyStrings, referralsStrings } from "./strings";

const UNIQUE_VIOLATION = "23505";

async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

export async function applyToJob(input: unknown): Promise<ActionResult<{ applicationId: string }>> {
  const parsed = applySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? applyStrings.errors.invalid);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(applyStrings.errors.not_authenticated);

  const { jobId, cvId, coverNote, answers, referralId } = parsed.data;
  const { data: applicationId, error } = await supabase.rpc("apply_to_job", {
    p_job_id: jobId,
    p_cv_id: cvId,
    p_cover_note: coverNote,
    p_answers: answers,
    p_referral_id: referralId,
  });
  if (error || !applicationId) return fail(dbErrorMessage(error, applyStrings.errors, applyStrings.errors.generic));

  revalidatePath("/applications");
  revalidatePath(`/jobs/${jobId}`);
  return ok({ applicationId });
}

export async function pickInterviewSlot(input: unknown): Promise<ActionResult> {
  const parsed = slotSchema.safeParse(input);
  if (!parsed.success) return fail(applicationsStrings.errors.generic);

  const { supabase } = await getSession();
  const { error } = await supabase.rpc("pick_interview_slot", { p_slot_id: parsed.data.slotId });
  if (error) return fail(dbErrorMessage(error, applicationsStrings.errors, applicationsStrings.errors.generic));

  revalidatePath("/applications", "layout");
  return ok();
}

export async function withdrawApplication(input: unknown): Promise<ActionResult> {
  const parsed = applicationIdSchema.safeParse(input);
  if (!parsed.success) return fail(applicationsStrings.errors.generic);

  const { supabase } = await getSession();
  const { error } = await supabase.rpc("withdraw_application", { p_application_id: parsed.data.applicationId });
  if (error) return fail(dbErrorMessage(error, applicationsStrings.errors, applicationsStrings.errors.generic));

  revalidatePath("/applications", "layout");
  return ok();
}

export async function addAffiliation(input: unknown): Promise<ActionResult> {
  const parsed = addAffiliationSchema.safeParse(input);
  if (!parsed.success) return fail(referralsStrings.errors.companyUnavailable);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(referralsStrings.errors.generic);

  const { error } = await supabase
    .from("company_affiliations")
    .insert({ user_id: userId, company_id: parsed.data.companyId });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return fail(referralsStrings.errors.duplicateAffiliation);
    // RLS rejects companies that are not verified and visible.
    return fail(referralsStrings.errors.companyUnavailable);
  }

  revalidatePath("/referrals");
  return ok();
}

export async function removeAffiliation(input: unknown): Promise<ActionResult> {
  const parsed = affiliationIdSchema.safeParse(input);
  if (!parsed.success) return fail(referralsStrings.errors.generic);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(referralsStrings.errors.generic);

  const { error } = await supabase
    .from("company_affiliations")
    .delete()
    .eq("id", parsed.data.affiliationId)
    .eq("user_id", userId);
  if (error) return fail(referralsStrings.errors.generic);

  revalidatePath("/referrals");
  return ok();
}

export async function createReferral(input: unknown): Promise<ActionResult<{ referralId: string }>> {
  const parsed = createReferralSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? referralsStrings.errors.generic);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(referralsStrings.errors.generic);

  const { jobId, note } = parsed.data;
  const { data, error } = await supabase
    .from("referrals")
    .insert({ job_id: jobId, referrer_id: userId, note })
    .select("id")
    .single();

  if (error?.code === UNIQUE_VIOLATION) {
    // One link per job and referrer: hand back the existing one.
    const { data: existing } = await supabase
      .from("referrals")
      .select("id")
      .eq("job_id", jobId)
      .eq("referrer_id", userId)
      .maybeSingle();
    if (!existing) return fail(referralsStrings.errors.generic);
    revalidatePath("/referrals");
    return ok({ referralId: existing.id });
  }
  if (error || !data) return fail(dbErrorMessage(error, referralsStrings.errors, referralsStrings.errors.generic));

  revalidatePath("/referrals");
  return ok({ referralId: data.id });
}

export async function deleteReferral(input: unknown): Promise<ActionResult> {
  const parsed = referralIdSchema.safeParse(input);
  if (!parsed.success) return fail(referralsStrings.errors.generic);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(referralsStrings.errors.generic);

  const { error } = await supabase
    .from("referrals")
    .delete()
    .eq("id", parsed.data.referralId)
    .eq("referrer_id", userId);
  if (error) return fail(referralsStrings.errors.generic);

  revalidatePath("/referrals");
  return ok();
}
