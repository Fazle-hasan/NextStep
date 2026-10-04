import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

import type { JobCardData, JobSearchRow, RecommendedJobRow } from "../types";

import { filtersToRpcArgs, jobFiltersSchema, type JobFilters } from "./schemas";

// All reads run as the current visitor, so RLS decides what is visible (hidden salaries never arrive).

export async function searchJobs(filters: JobFilters, page: number): Promise<{ jobs: JobSearchRow[]; total: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_jobs", filtersToRpcArgs(filters, page));
  if (error) throw new Error("Could not load jobs");
  return { jobs: data, total: Number(data[0]?.total_count ?? 0) };
}

export async function getRecommendedJobs(limit = 6): Promise<RecommendedJobRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("recommended_jobs", { p_limit: limit });
  if (error) throw new Error("Could not load recommendations");
  return data;
}

// Which of these jobs the user has saved.
export async function getSavedJobIds(userId: string, jobIds: string[]): Promise<Set<string>> {
  if (jobIds.length === 0) return new Set();
  const supabase = await createClient();
  const { data } = await supabase.from("saved_jobs").select("job_id").eq("user_id", userId).in("job_id", jobIds);
  return new Set((data ?? []).map((row) => row.job_id));
}

// Job cards built from tables (company page, saved jobs) ---------------------------------

const JOB_CARD_SELECT = `
  id, title, job_type, work_mode, experience_level, status, published_at, created_at, application_deadline,
  cities ( name ),
  neighbourhoods ( name ),
  job_salaries ( salary_min, salary_max, is_visible ),
  companies!inner ( name, slug, logo_path, is_community_owned, leap_friendly )
` as const;

type JobCardSource = {
  id: string;
  title: string;
  job_type: Enums<"job_type">;
  work_mode: Enums<"work_mode">;
  experience_level: Enums<"experience_level">;
  status: Enums<"job_status">;
  published_at: string | null;
  created_at: string;
  application_deadline: string | null;
  cities: { name: string } | null;
  neighbourhoods: { name: string } | null;
  job_salaries: { salary_min: number | null; salary_max: number | null; is_visible: boolean } | null;
  companies: { name: string; slug: string; logo_path: string | null; is_community_owned: boolean; leap_friendly: boolean };
};

export type JobCardWithStatus = JobCardData & { status: Enums<"job_status"> };

function toJobCard(job: JobCardSource): JobCardWithStatus {
  const salary = job.job_salaries?.is_visible ? job.job_salaries : null;
  return {
    id: job.id,
    title: job.title,
    job_type: job.job_type,
    work_mode: job.work_mode,
    experience_level: job.experience_level,
    status: job.status,
    city_name: job.cities?.name ?? "",
    neighbourhood_name: job.neighbourhoods?.name ?? "",
    company_name: job.companies.name,
    company_slug: job.companies.slug,
    company_logo_path: job.companies.logo_path ?? "",
    is_community_owned: job.companies.is_community_owned,
    leap_friendly: job.companies.leap_friendly,
    // The generated RPC row type marks these as non-null; they are null when no salary is shown.
    salary_min: salary?.salary_min as number,
    salary_max: salary?.salary_max as number,
    published_at: job.published_at ?? job.created_at,
    application_deadline: job.application_deadline ?? "",
  };
}

export async function getCompanyOpenJobs(companyId: string): Promise<JobCardWithStatus[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_CARD_SELECT)
    .eq("company_id", companyId)
    .eq("status", "published")
    .is("hidden_at", null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("published_at", { ascending: false })
    .limit(50)
    .overrideTypes<JobCardSource[], { merge: false }>();
  if (error) throw new Error("Could not load jobs");
  return data.map(toJobCard);
}

export type SavedJob = { savedId: string; jobId: string; job: JobCardWithStatus | null };

// A saved job whose listing is no longer visible to the user comes back with job = null.
export async function getSavedJobs(userId: string): Promise<SavedJob[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_jobs")
    .select(`id, job_id, jobs ( ${JOB_CARD_SELECT} )`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .overrideTypes<{ id: string; job_id: string; jobs: JobCardSource | null }[], { merge: false }>();
  if (error) throw new Error("Could not load saved jobs");
  return data.map((row) => ({ savedId: row.id, jobId: row.job_id, job: row.jobs ? toJobCard(row.jobs) : null }));
}

export type SavedSearch = {
  id: string;
  name: string;
  filters: JobFilters;
  daily: boolean;
};

export async function getSavedSearches(userId: string): Promise<SavedSearch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_searches")
    .select("id, name, filters, alert_frequency")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load saved searches");
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    filters: jobFiltersSchema.parse(row.filters ?? {}),
    daily: row.alert_frequency === "daily",
  }));
}

// Job detail ---------------------------------------------------------------------------

export type JobDetail = {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  job_type: Enums<"job_type">;
  work_mode: Enums<"work_mode">;
  experience_level: Enums<"experience_level">;
  status: Enums<"job_status">;
  address_text: string | null;
  openings: number;
  application_deadline: string | null;
  published_at: string | null;
  created_at: string;
  expires_at: string | null;
  cityName: string | null;
  neighbourhoodName: string | null;
  company: {
    id: string;
    name: string;
    slug: string;
    logo_path: string | null;
    description: string | null;
    is_community_owned: boolean;
    leap_friendly: boolean;
  };
  salary: { min: number | null; max: number | null } | null;
  skills: string[];
  questionCount: number;
};

type JobDetailSource = Omit<JobDetail, "cityName" | "neighbourhoodName" | "company" | "salary" | "skills" | "questionCount"> & {
  cities: { name: string } | null;
  neighbourhoods: { name: string } | null;
  companies: JobDetail["company"];
  job_salaries: { salary_min: number | null; salary_max: number | null; is_visible: boolean } | null;
  job_skills: { skills: { name: string } | null }[];
  job_screening_questions: { id: string }[];
};

// Returns null when the job does not exist or the visitor may not see it.
export async function getJobDetail(id: string): Promise<JobDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select(
      `id, title, description, requirements, job_type, work_mode, experience_level, status, address_text, openings,
       application_deadline, published_at, created_at, expires_at,
       cities ( name ),
       neighbourhoods ( name ),
       companies!inner ( id, name, slug, logo_path, description, is_community_owned, leap_friendly ),
       job_salaries ( salary_min, salary_max, is_visible ),
       job_skills ( skills ( name ) ),
       job_screening_questions ( id )`,
    )
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<JobDetailSource, { merge: false }>();
  if (error || !data) return null;

  const { cities, neighbourhoods, companies, job_salaries, job_skills, job_screening_questions, ...job } = data;
  return {
    ...job,
    cityName: cities?.name ?? null,
    neighbourhoodName: neighbourhoods?.name ?? null,
    company: companies,
    // Only a salary the employer chose to show (company members can read hidden ones, but this is the public page).
    salary: job_salaries?.is_visible ? { min: job_salaries.salary_min, max: job_salaries.salary_max } : null,
    skills: job_skills.flatMap((row) => (row.skills ? [row.skills.name] : [])).sort((a, b) => a.localeCompare(b)),
    questionCount: job_screening_questions.length,
  };
}

export async function hasAppliedToJob(jobId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_applications")
    .select("id")
    .eq("job_id", jobId)
    .eq("applicant_id", userId)
    .maybeSingle();
  return data !== null;
}

// Company page ---------------------------------------------------------------------------

export type CompanyProfile = {
  id: string;
  name: string;
  slug: string;
  logo_path: string | null;
  industry: string | null;
  size: Enums<"company_size"> | null;
  website: string | null;
  description: string | null;
  is_community_owned: boolean;
  leap_friendly: boolean;
  verification_status: Enums<"verification_status">;
  locations: { id: string; address: string | null; cityName: string }[];
};

export async function getCompanyBySlug(slug: string): Promise<CompanyProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select(
      `id, name, slug, logo_path, industry, size, website, description, is_community_owned, leap_friendly,
       verification_status, company_locations ( id, address, cities ( name ) )`,
    )
    .eq("slug", slug)
    .maybeSingle()
    .overrideTypes<
      Omit<CompanyProfile, "locations"> & {
        company_locations: { id: string; address: string | null; cities: { name: string } | null }[];
      },
      { merge: false }
    >();
  if (error || !data) return null;

  const { company_locations, ...company } = data;
  return {
    ...company,
    locations: company_locations.map((l) => ({ id: l.id, address: l.address, cityName: l.cities?.name ?? "" })),
  };
}
