import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

import type { CompanyAffiliation, CompanyJob, CompanyLocation, EmployerCompany, JobForEdit } from "./types";

type Company = Tables<"companies">;

async function getMyCompanyIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("company_members").select("company_id").eq("user_id", userId);
  if (error) throw new Error("Could not load your companies");
  return data.map((row) => row.company_id);
}

// Companies the user is a member of (no jobs), oldest first.
export async function getMyCompaniesBasic(userId: string): Promise<Company[]> {
  const ids = await getMyCompanyIds(userId);
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select("*").in("id", ids).order("created_at");
  if (error) throw new Error("Could not load your companies");
  return data;
}

// Everything the employer dashboard shows: companies with jobs, applicant counts and affiliations.
export async function getEmployerDashboard(userId: string): Promise<EmployerCompany[]> {
  const companies = await getMyCompaniesBasic(userId);
  if (companies.length === 0) return [];
  const companyIds = companies.map((c) => c.id);
  const supabase = await createClient();

  const [jobsResult, affiliationsResult, requestsResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, company_id, title, status, application_deadline, published_at, created_at")
      .in("company_id", companyIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("company_affiliations")
      .select("id, company_id, user_id, confirmed_by_company_at")
      .in("company_id", companyIds)
      .order("created_at"),
    supabase
      .from("verification_requests")
      .select("subject_id, status, rejection_reason, created_at")
      .eq("kind", "company")
      .in("subject_id", companyIds)
      .order("created_at", { ascending: false }),
  ]);
  if (jobsResult.error || affiliationsResult.error || requestsResult.error) {
    throw new Error("Could not load the employer dashboard");
  }

  const jobIds = jobsResult.data.map((j) => j.id);
  const userIds = [...new Set(affiliationsResult.data.map((a) => a.user_id))];
  const [applicationsResult, profilesResult] = await Promise.all([
    jobIds.length
      ? supabase.from("job_applications").select("job_id").in("job_id", jobIds).neq("status", "withdrawn")
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (applicationsResult.error || profilesResult.error) throw new Error("Could not load the employer dashboard");

  const applicantCounts = new Map<string, number>();
  for (const row of applicationsResult.data) {
    applicantCounts.set(row.job_id, (applicantCounts.get(row.job_id) ?? 0) + 1);
  }
  const names = new Map(profilesResult.data.map((p) => [p.id, p.full_name]));

  return companies.map((company) => {
    const jobs: CompanyJob[] = jobsResult.data
      .filter((j) => j.company_id === company.id)
      .map((j) => ({ ...j, applicantCount: applicantCounts.get(j.id) ?? 0 }));
    const affiliations: CompanyAffiliation[] = affiliationsResult.data
      .filter((a) => a.company_id === company.id)
      .map((a) => ({ id: a.id, name: names.get(a.user_id) ?? null, confirmedAt: a.confirmed_by_company_at }));
    // Requests are newest first; the first rejected one explains the current "declined" state.
    const lastRequest = requestsResult.data.find((r) => r.subject_id === company.id);
    return {
      company,
      jobs,
      affiliations,
      rejectionReason: lastRequest?.status === "rejected" ? lastRequest.rejection_reason : null,
    };
  });
}

// A company the user belongs to, or null (not found or not a member).
export async function getMyCompany(userId: string, companyId: string): Promise<Company | null> {
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("company_members")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!member) return null;
  const { data } = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
  return data;
}

export async function getCompanyLocations(companyId: string): Promise<CompanyLocation[]> {
  const supabase = await createClient();
  const [{ data, error }, { data: cities }] = await Promise.all([
    supabase.from("company_locations").select("id, city_id, address").eq("company_id", companyId).order("created_at"),
    supabase.from("cities").select("id, name"),
  ]);
  if (error) throw new Error("Could not load locations");
  const cityNames = new Map((cities ?? []).map((c) => [c.id, c.name]));
  return data.map((l) => ({ id: l.id, cityName: cityNames.get(l.city_id) ?? "", address: l.address }));
}

// A job of one of the user's companies with everything the edit form needs, or null.
export async function getJobForEdit(userId: string, jobId: string): Promise<JobForEdit | null> {
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job) return null;
  const company = await getMyCompany(userId, job.company_id);
  if (!company) return null;

  const [salary, skills, questions, applications] = await Promise.all([
    supabase.from("job_salaries").select("salary_min, salary_max, is_visible").eq("job_id", jobId).maybeSingle(),
    supabase.from("job_skills").select("skill_id").eq("job_id", jobId),
    supabase.from("job_screening_questions").select("question, is_required, position").eq("job_id", jobId).order("position"),
    supabase.from("job_applications").select("id", { count: "exact", head: true }).eq("job_id", jobId),
  ]);
  if (salary.error || skills.error || questions.error || applications.error) throw new Error("Could not load the job");

  return {
    job,
    company,
    salary: salary.data,
    skillIds: skills.data.map((s) => s.skill_id),
    questions: questions.data.map((q) => ({ question: q.question, isRequired: q.is_required })),
    hasApplications: (applications.count ?? 0) > 0,
  };
}
