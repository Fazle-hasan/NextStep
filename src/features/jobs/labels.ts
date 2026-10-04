import type { Enums } from "@/types/database";

// Display labels for job-related enums (one place, so they can be translated later).

export const JOB_TYPE_LABELS: Record<Enums<"job_type">, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",
};

export const WORK_MODE_LABELS: Record<Enums<"work_mode">, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
};

export const EXPERIENCE_LEVEL_LABELS: Record<Enums<"experience_level">, string> = {
  entry: "Entry level",
  mid: "Mid level",
  senior: "Senior",
  lead: "Lead",
};

export const JOB_STATUS_LABELS: Record<Enums<"job_status">, string> = {
  draft: "Draft",
  pending_review: "Waiting for admin review",
  published: "Live",
  closed: "Closed",
  expired: "Expired",
};

export const APPLICATION_STATUS_LABELS: Record<Enums<"application_status">, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};

// Pipeline columns, in order (PRODUCT_SPEC §4).
export const PIPELINE_STATUSES = ["applied", "shortlisted", "interview", "offer", "hired", "rejected"] as const satisfies readonly Enums<"application_status">[];

export const COMPANY_SIZE_LABELS: Record<Enums<"company_size">, string> = {
  s1_10: "1–10 people",
  s11_50: "11–50 people",
  s51_200: "51–200 people",
  s201_1000: "201–1,000 people",
  s1000_plus: "More than 1,000 people",
};

export const VERIFICATION_STATUS_LABELS: Record<Enums<"verification_status">, string> = {
  pending: "Waiting for verification",
  approved: "Verified",
  rejected: "Verification declined",
};
