import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/types/database";

// Everything here runs as the signed-in employer, so RLS decides what is readable:
// only applications to jobs of a company the viewer belongs to, and only live applicants' profiles.

export type PipelineApplicant = {
  id: string;
  applicantId: string;
  name: string | null;
  headline: string | null;
  status: Enums<"application_status">;
  referred: boolean;
  appliedAt: string;
};

export type PipelineJob = {
  id: string;
  title: string;
  status: Enums<"job_status">;
  applicants: PipelineApplicant[];
};

export async function getPipeline(jobId: string): Promise<PipelineJob | null> {
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("id, title, status, company_id").eq("id", jobId).maybeSingle();
  if (!job) return null;

  const { data: isMember } = await supabase.rpc("is_company_member", { p_company_id: job.company_id });
  if (!isMember) return null;

  const { data: applications, error } = await supabase
    .from("job_applications")
    .select("id, applicant_id, status, referral_id, created_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load applicants");

  const applicantIds = applications.map((a) => a.applicant_id);
  const [{ data: profiles }, { data: seekerProfiles }] = applicantIds.length
    ? await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", applicantIds),
        supabase.from("seeker_profiles").select("user_id, headline").in("user_id", applicantIds),
      ])
    : [{ data: [] }, { data: [] }];
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const headlines = new Map((seekerProfiles ?? []).map((p) => [p.user_id, p.headline]));

  return {
    id: job.id,
    title: job.title,
    status: job.status,
    applicants: applications.map((a) => ({
      id: a.id,
      applicantId: a.applicant_id,
      name: names.get(a.applicant_id) ?? null,
      headline: headlines.get(a.applicant_id) ?? null,
      status: a.status,
      referred: a.referral_id !== null,
      appliedAt: a.created_at,
    })),
  };
}

export type ApplicantNote = { id: string; body: string; createdAt: string; authorName: string | null; isMine: boolean };

export type ApplicantReferral = {
  referrerName: string | null;
  note: string | null;
  // null when the referrer no longer lists the company.
  affiliationConfirmed: boolean | null;
};

export type ApplicantDetail = {
  application: Pick<Tables<"job_applications">, "id" | "status" | "cover_note" | "created_at" | "applicant_id">;
  job: { id: string; title: string };
  name: string | null;
  seekerProfile: Tables<"seeker_profiles"> | null;
  skills: string[];
  experiences: Tables<"experiences">[];
  educations: Tables<"educations">[];
  salary: Pick<Tables<"seeker_salary_prefs">, "salary_min" | "salary_max"> | null;
  answers: { question: string; answer: string | null; isRequired: boolean }[];
  history: Pick<Tables<"application_status_history">, "id" | "from_status" | "to_status" | "created_at">[];
  notes: ApplicantNote[];
  slots: Pick<Tables<"interview_slots">, "id" | "starts_at" | "ends_at" | "location_or_link" | "status">[];
  referral: ApplicantReferral | null;
  hasCv: boolean;
};

export async function getApplicantDetail(applicationId: string, viewerId: string): Promise<ApplicantDetail | null> {
  const supabase = await createClient();
  const { data: application } = await supabase
    .from("job_applications")
    .select("id, job_id, applicant_id, cv_id, cover_note, status, referral_id, created_at")
    .eq("id", applicationId)
    .maybeSingle();
  if (!application) return null;

  const { data: job } = await supabase.from("jobs").select("id, title, company_id").eq("id", application.job_id).maybeSingle();
  if (!job) return null;
  // Applicants can read their own application too; this page is for the employer only.
  const { data: isMember } = await supabase.rpc("is_company_member", { p_company_id: job.company_id });
  if (!isMember) return null;

  const userId = application.applicant_id;
  const [profile, seekerProfile, skills, experiences, educations, salary, questions, answers, history, notes, slots, cv, referral] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      supabase.from("seeker_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("profile_skills").select("skills(name)").eq("user_id", userId),
      supabase.from("experiences").select("*").eq("user_id", userId).order("start_date", { ascending: false }),
      supabase.from("educations").select("*").eq("user_id", userId).order("end_year", { ascending: false, nullsFirst: true }),
      supabase.from("seeker_salary_prefs").select("salary_min, salary_max").eq("user_id", userId).maybeSingle(),
      supabase.from("job_screening_questions").select("id, question, is_required").eq("job_id", job.id).order("position"),
      supabase.from("application_answers").select("question_id, answer").eq("application_id", applicationId),
      supabase
        .from("application_status_history")
        .select("id, from_status, to_status, created_at")
        .eq("application_id", applicationId)
        .order("created_at"),
      supabase
        .from("application_notes")
        .select("id, body, author_id, created_at")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("interview_slots")
        .select("id, starts_at, ends_at, location_or_link, status")
        .eq("application_id", applicationId)
        .order("starts_at"),
      supabase.from("cvs").select("id").eq("id", application.cv_id).maybeSingle(),
      application.referral_id
        ? supabase.from("referrals").select("referrer_id, note").eq("id", application.referral_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const authorIds = [...new Set((notes.data ?? []).map((n) => n.author_id).filter((v): v is string => v !== null))];
  const peopleIds = [...new Set([...authorIds, ...(referral.data ? [referral.data.referrer_id] : [])])];
  const [{ data: people }, { data: affiliation }] = await Promise.all([
    peopleIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", peopleIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    referral.data
      ? supabase
          .from("company_affiliations")
          .select("confirmed_by_company_at")
          .eq("user_id", referral.data.referrer_id)
          .eq("company_id", job.company_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));
  const answerByQuestion = new Map((answers.data ?? []).map((a) => [a.question_id, a.answer]));

  return {
    application: {
      id: application.id,
      status: application.status,
      cover_note: application.cover_note,
      created_at: application.created_at,
      applicant_id: userId,
    },
    job: { id: job.id, title: job.title },
    name: profile.data?.full_name ?? null,
    seekerProfile: seekerProfile.data ?? null,
    skills: (skills.data ?? []).map((s) => s.skills?.name).filter((v): v is string => Boolean(v)).sort(),
    experiences: experiences.data ?? [],
    educations: educations.data ?? [],
    salary: salary.data ?? null,
    answers: (questions.data ?? []).map((q) => ({
      question: q.question,
      answer: answerByQuestion.get(q.id) ?? null,
      isRequired: q.is_required,
    })),
    history: history.data ?? [],
    notes: (notes.data ?? []).map((n) => ({
      id: n.id,
      body: n.body,
      createdAt: n.created_at,
      authorName: n.author_id ? (names.get(n.author_id) ?? null) : null,
      isMine: n.author_id === viewerId,
    })),
    slots: slots.data ?? [],
    referral: referral.data
      ? {
          referrerName: names.get(referral.data.referrer_id) ?? null,
          note: referral.data.note,
          affiliationConfirmed: affiliation ? affiliation.confirmed_by_company_at !== null : null,
        }
      : null,
    hasCv: Boolean(cv.data),
  };
}
