"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import { basicsSchema, educationSchema, experienceSchema, idSchema, salarySchema, skillsSchema } from "./schemas";
import { seekerStrings } from "./strings";

const { errors } = seekerStrings;
const PROFILE_PATH = "/profile";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type DbError = { message?: string; code?: string } | null;

async function getSession(): Promise<{ supabase: Supabase; userId: string | null }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? errors.generic;
}

function finish(error: DbError): ActionResult {
  if (error) return fail(dbErrorMessage(error, {}, errors.generic));
  revalidatePath(PROFILE_PATH);
  return ok();
}

export async function saveBasics(input: unknown): Promise<ActionResult> {
  const parsed = basicsSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const values = {
    headline: parsed.data.headline,
    summary: parsed.data.summary,
    experience_level: parsed.data.experienceLevel,
    work_mode_pref: parsed.data.workModePref,
    preferred_city_ids: parsed.data.preferredCityIds,
    languages: parsed.data.languages,
    linkedin_url: parsed.data.linkedinUrl,
    portfolio_url: parsed.data.portfolioUrl,
    open_to_relocate: parsed.data.openToRelocate,
  };

  // Update-then-insert rather than upsert: user_id is not in the column update grant.
  const { data: updated, error } = await supabase.from("seeker_profiles").update(values).eq("user_id", userId).select("user_id");
  if (error) return finish(error);
  if (updated.length > 0) return finish(null);
  const { error: insertError } = await supabase.from("seeker_profiles").insert({ user_id: userId, ...values });
  return finish(insertError);
}

export async function saveSkills(input: unknown): Promise<ActionResult> {
  const parsed = skillsSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const wanted = [...new Set(parsed.data.skillIds)];
  const { data: current, error } = await supabase.from("profile_skills").select("skill_id").eq("user_id", userId);
  if (error) return finish(error);

  const have = current.map((row) => row.skill_id);
  const toRemove = have.filter((id) => !wanted.includes(id));
  const toAdd = wanted.filter((id) => !have.includes(id));

  if (toRemove.length > 0) {
    const { error: removeError } = await supabase.from("profile_skills").delete().eq("user_id", userId).in("skill_id", toRemove);
    if (removeError) return finish(removeError);
  }
  if (toAdd.length > 0) {
    const { error: addError } = await supabase
      .from("profile_skills")
      .insert(toAdd.map((skill_id) => ({ user_id: userId, skill_id })));
    if (addError) return finish(addError);
  }
  return finish(null);
}

export async function saveExperience(input: unknown): Promise<ActionResult> {
  const parsed = experienceSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const values = {
    title: parsed.data.title,
    company_name: parsed.data.companyName,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    is_current: parsed.data.isCurrent,
    description: parsed.data.description,
  };
  const { error } = parsed.data.id
    ? await supabase.from("experiences").update(values).eq("id", parsed.data.id).eq("user_id", userId)
    : await supabase.from("experiences").insert({ user_id: userId, ...values });
  return finish(error);
}

export async function deleteExperience(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);
  const { error } = await supabase.from("experiences").delete().eq("id", parsed.data).eq("user_id", userId);
  return finish(error);
}

export async function saveEducation(input: unknown): Promise<ActionResult> {
  const parsed = educationSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const values = {
    institution: parsed.data.institution,
    degree: parsed.data.degree,
    field: parsed.data.field,
    start_year: parsed.data.startYear,
    end_year: parsed.data.endYear,
  };
  const { error } = parsed.data.id
    ? await supabase.from("educations").update(values).eq("id", parsed.data.id).eq("user_id", userId)
    : await supabase.from("educations").insert({ user_id: userId, ...values });
  return finish(error);
}

export async function deleteEducation(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);
  const { error } = await supabase.from("educations").delete().eq("id", parsed.data).eq("user_id", userId);
  return finish(error);
}

export async function saveSalary(input: unknown): Promise<ActionResult> {
  const parsed = salarySchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const values = {
    salary_min: parsed.data.minLakh,
    salary_max: parsed.data.maxLakh,
    share_with_employers: parsed.data.shareWithEmployers,
  };
  const { data: updated, error } = await supabase
    .from("seeker_salary_prefs")
    .update(values)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return finish(error);
  if (updated.length > 0) return finish(null);
  const { error: insertError } = await supabase.from("seeker_salary_prefs").insert({ user_id: userId, ...values });
  return finish(insertError);
}
