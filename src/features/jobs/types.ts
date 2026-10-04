import type { Database } from "@/types/database";

// One row of search_jobs(). recommended_jobs() returns the same shape with `score` instead of distance/total.
export type JobSearchRow = Database["public"]["Functions"]["search_jobs"]["Returns"][number];
export type RecommendedJobRow = Database["public"]["Functions"]["recommended_jobs"]["Returns"][number];

// What a job card needs; both RPC row types satisfy it.
export type JobCardData = Pick<
  JobSearchRow,
  | "id"
  | "title"
  | "job_type"
  | "work_mode"
  | "experience_level"
  | "city_name"
  | "neighbourhood_name"
  | "company_name"
  | "company_slug"
  | "company_logo_path"
  | "is_community_owned"
  | "leap_friendly"
  | "salary_min"
  | "salary_max"
  | "published_at"
  | "application_deadline"
> & { distance_km?: number | null };

export type SkillOption = { id: string; name: string };
export type NeighbourhoodOption = { id: string; name: string; city_id: string };
