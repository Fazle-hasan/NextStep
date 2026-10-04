import type { DefaultValues } from "react-hook-form";

import { paiseToLakh } from "@/lib/utils/money";
import type { Tables } from "@/types/database";

import type { CompanyFormInput, JobFormInput } from "./schemas";
import type { JobForEdit } from "./types";
import { parseEwkbPoint } from "@/lib/maps/geo";

// Form default values built from database rows (the forms keep "" for "nothing entered").

export const NEW_COMPANY_DEFAULTS: CompanyFormInput = {
  name: "",
  industry: "",
  size: "",
  website: "",
  description: "",
  isCommunityOwned: false,
  leapFriendly: false,
  verificationNote: "",
};

export function companyDefaults(company: Tables<"companies">): CompanyFormInput {
  return {
    name: company.name,
    industry: company.industry ?? "",
    size: company.size ?? "",
    website: company.website ?? "",
    description: company.description ?? "",
    isCommunityOwned: company.is_community_owned,
    leapFriendly: company.leap_friendly,
    verificationNote: "",
  };
}

export const NEW_JOB_DEFAULTS: DefaultValues<JobFormInput> = {
  title: "",
  description: "",
  requirements: "",
  cityId: "",
  neighbourhoodId: "",
  addressText: "",
  locationLat: null,
  locationLng: null,
  openings: 1,
  applicationDeadline: "",
  skillIds: [],
  salaryMinLakh: "",
  salaryMaxLakh: "",
  salaryVisible: true,
  questions: [],
};

function lakhInput(paise: number | null | undefined): string {
  return paise == null ? "" : String(paiseToLakh(paise));
}

export function jobDefaults({ job, salary, skillIds, questions }: JobForEdit): DefaultValues<JobFormInput> {
  // The saved point (a pin the employer placed, or the area centre the database chose).
  const pin = typeof job.location === "string" ? parseEwkbPoint(job.location) : null;
  return {
    title: job.title,
    description: job.description,
    requirements: job.requirements ?? "",
    jobType: job.job_type,
    workMode: job.work_mode,
    experienceLevel: job.experience_level,
    cityId: job.city_id ?? "",
    neighbourhoodId: job.neighbourhood_id ?? "",
    addressText: job.address_text ?? "",
    locationLat: pin?.lat ?? null,
    locationLng: pin?.lng ?? null,
    openings: job.openings,
    applicationDeadline: job.application_deadline ?? "",
    skillIds,
    salaryMinLakh: lakhInput(salary?.salary_min),
    salaryMaxLakh: lakhInput(salary?.salary_max),
    salaryVisible: salary?.is_visible ?? true,
    questions,
  };
}
