"use server";

import { revalidatePath } from "next/cache";

import { getViewer } from "@/features/auth/queries";
import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { lakhToPaise } from "@/lib/utils/money";

import { jobIdSchema, jobStatusSchema, saveJobSchema, type JobFormValues } from "./schemas";
import { employerStrings } from "./strings";
import type { JobStatusResult } from "./types";
import { toEwktPoint } from "@/lib/maps/geo";

// Job posting server actions. Status rules are enforced by the database trigger (jobs_enforce_status).

const { errors, dbErrors } = employerStrings;

type Supabase = Awaited<ReturnType<typeof createClient>>;

function revalidateJob(jobId: string) {
  revalidatePath("/employer");
  revalidatePath(`/employer/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/jobs");
}

// Asks for a status; returns the status the database settled on
// (publishing a company's first job lands on pending_review).
async function changeStatus(
  supabase: Supabase,
  jobId: string,
  status: "published" | "draft" | "closed",
): Promise<ActionResult<JobStatusResult>> {
  const { data, error } = await supabase.from("jobs").update({ status }).eq("id", jobId).select("id, status").maybeSingle();
  if (error) return fail(dbErrorMessage(error, dbErrors, errors.generic));
  if (!data) return fail(errors.notFound);
  return ok({ jobId: data.id, status: data.status });
}

async function syncSkills(supabase: Supabase, jobId: string, skillIds: string[]): Promise<boolean> {
  const { data: existing, error } = await supabase.from("job_skills").select("skill_id").eq("job_id", jobId);
  if (error) return false;
  const current = existing.map((s) => s.skill_id);
  const removed = current.filter((id) => !skillIds.includes(id));
  const added = skillIds.filter((id) => !current.includes(id));
  if (removed.length) {
    const { error: e } = await supabase.from("job_skills").delete().eq("job_id", jobId).in("skill_id", removed);
    if (e) return false;
  }
  if (added.length) {
    const { error: e } = await supabase.from("job_skills").insert(added.map((skill_id) => ({ job_id: jobId, skill_id })));
    if (e) return false;
  }
  return true;
}

async function syncSalary(supabase: Supabase, jobId: string, v: JobFormValues): Promise<boolean> {
  if (v.salaryMinLakh == null && v.salaryMaxLakh == null) {
    const { error } = await supabase.from("job_salaries").delete().eq("job_id", jobId);
    return !error;
  }
  const salary = {
    salary_min: v.salaryMinLakh != null ? lakhToPaise(v.salaryMinLakh) : null,
    salary_max: v.salaryMaxLakh != null ? lakhToPaise(v.salaryMaxLakh) : null,
    is_visible: v.salaryVisible,
  };
  // Update-then-insert rather than upsert: the update grant does not include job_id.
  const { data: updated, error } = await supabase.from("job_salaries").update(salary).eq("job_id", jobId).select("job_id");
  if (error) return false;
  if (updated.length > 0) return true;
  const { error: insertError } = await supabase.from("job_salaries").insert({ job_id: jobId, ...salary });
  return !insertError;
}

// Questions are replaced as a set, and only while nobody has applied (answers point at them).
async function syncQuestions(supabase: Supabase, jobId: string, questions: JobFormValues["questions"]): Promise<boolean> {
  const { count, error } = await supabase
    .from("job_applications")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);
  if (error) return false;
  if ((count ?? 0) > 0) return true;

  const { error: deleteError } = await supabase.from("job_screening_questions").delete().eq("job_id", jobId);
  if (deleteError) return false;
  if (questions.length === 0) return true;
  const { error: insertError } = await supabase
    .from("job_screening_questions")
    .insert(questions.map((q, position) => ({ job_id: jobId, question: q.question, is_required: q.isRequired, position })));
  return !insertError;
}

// Creates a draft or updates a job, then optionally asks to publish it.
export async function saveJob(input: unknown): Promise<ActionResult<JobStatusResult & { publishError?: string }>> {
  const parsed = saveJobSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || errors.generic);
  const { companyId, publish, values: v } = parsed.data;

  const viewer = await getViewer();
  if (!viewer) return fail(errors.notSignedIn);
  const supabase = await createClient();

  const fields = {
    title: v.title,
    description: v.description,
    requirements: v.requirements ?? null,
    job_type: v.jobType,
    work_mode: v.workMode,
    experience_level: v.experienceLevel,
    city_id: v.cityId ?? null,
    neighbourhood_id: v.cityId ? (v.neighbourhoodId ?? null) : null,
    address_text: v.addressText ?? null,
    openings: v.openings,
    application_deadline: v.applicationDeadline ?? null,
  };

  // A pin the employer placed. Without one, location: null makes the trigger place the job from the
  // neighbourhood or city centre.
  const pin =
    v.cityId && v.locationLat != null && v.locationLng != null
      ? toEwktPoint({ lat: v.locationLat, lng: v.locationLng })
      : null;

  let saved: { id: string; status: JobStatusResult["status"] } | null;
  if (parsed.data.jobId) {
    const { data, error } = await supabase
      .from("jobs")
      .update({ ...fields, location: pin })
      .eq("id", parsed.data.jobId)
      .select("id, status")
      .maybeSingle();
    if (error) return fail(dbErrorMessage(error, dbErrors, errors.generic));
    saved = data;
  } else {
    const { data, error } = await supabase
      .from("jobs")
      .insert({ ...fields, location: pin, company_id: companyId, posted_by: viewer.id })
      .select("id, status")
      .maybeSingle();
    if (error) return fail(error.code === "42501" ? dbErrors.not_company_member : dbErrorMessage(error, dbErrors, errors.generic));
    saved = data;
  }
  if (!saved) return fail(errors.notFound);

  const synced =
    (await syncSkills(supabase, saved.id, v.skillIds)) &&
    (await syncSalary(supabase, saved.id, v)) &&
    (await syncQuestions(supabase, saved.id, v.questions));
  if (!synced) {
    revalidateJob(saved.id);
    return fail(errors.generic);
  }

  let result: JobStatusResult & { publishError?: string } = { jobId: saved.id, status: saved.status };
  if (publish && (saved.status === "draft" || saved.status === "closed")) {
    const published = await changeStatus(supabase, saved.id, "published");
    // The job itself is saved either way; report why it could not be published.
    result = published.ok ? published.data : { ...result, publishError: published.error };
  }

  revalidateJob(saved.id);
  return ok(result);
}

export async function setJobStatus(input: unknown): Promise<ActionResult<JobStatusResult>> {
  const parsed = jobStatusSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);

  const supabase = await createClient();
  const result = await changeStatus(supabase, parsed.data.jobId, parsed.data.status);
  if (result.ok) revalidateJob(parsed.data.jobId);
  return result;
}

export async function deleteJob(input: unknown): Promise<ActionResult> {
  const parsed = jobIdSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", parsed.data.jobId)
    .eq("status", "draft")
    .select("id");
  if (error) return fail(errors.generic);
  if (data.length === 0) return fail(errors.deleteOnlyDrafts);

  revalidatePath("/employer");
  return ok();
}
