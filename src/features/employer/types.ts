import type { Enums, Tables } from "@/types/database";

export type CompanyJob = Pick<
  Tables<"jobs">,
  "id" | "company_id" | "title" | "status" | "application_deadline" | "published_at" | "created_at"
> & { applicantCount: number };

export type CompanyAffiliation = { id: string; name: string | null; confirmedAt: string | null };

export type CompanyLocation = { id: string; cityName: string; address: string | null };

export type EmployerCompany = {
  company: Tables<"companies">;
  jobs: CompanyJob[];
  affiliations: CompanyAffiliation[];
  // Reason from the latest verification request when it was declined.
  rejectionReason: string | null;
};

export type JobForEdit = {
  job: Tables<"jobs">;
  company: Tables<"companies">;
  salary: Pick<Tables<"job_salaries">, "salary_min" | "salary_max" | "is_visible"> | null;
  skillIds: string[];
  questions: { question: string; isRequired: boolean }[];
  hasApplications: boolean;
};

// Result of saving or changing a job's status: the status the database settled on.
export type JobStatusResult = { jobId: string; status: Enums<"job_status"> };
