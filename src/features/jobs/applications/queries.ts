import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

type ApplicationStatus = Enums<"application_status">;
type SlotStatus = Enums<"interview_slot_status">;

// Apply page -------------------------------------------------------------------

export type ApplyContext = {
  job: { id: string; title: string; companyName: string; isOpen: boolean; deadline: string | null };
  questions: { id: string; question: string; is_required: boolean }[];
  cvs: { id: string; file_name: string; is_default: boolean }[];
  existingApplicationId: string | null;
};

function todayInIndia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

// Null when the job does not exist or the viewer may not see it (RLS).
export async function getApplyContext(jobId: string, userId: string): Promise<ApplyContext | null> {
  const supabase = await createClient();
  const { data: job, error } = await supabase
    .from("jobs")
    .select("id, title, status, hidden_at, application_deadline, companies(name)")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw new Error("Could not load the job");
  if (!job) return null;

  const [questions, cvs, existing] = await Promise.all([
    supabase.from("job_screening_questions").select("id, question, is_required").eq("job_id", jobId).order("position"),
    supabase
      .from("cvs")
      .select("id, file_name, is_default")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("job_applications").select("id").eq("job_id", jobId).eq("applicant_id", userId).maybeSingle(),
  ]);
  if (questions.error || cvs.error || existing.error) throw new Error("Could not load the application form");

  const deadlineOpen = !job.application_deadline || job.application_deadline >= todayInIndia();
  return {
    job: {
      id: job.id,
      title: job.title,
      companyName: job.companies?.name ?? "",
      isOpen: job.status === "published" && !job.hidden_at && deadlineOpen,
      deadline: job.application_deadline,
    },
    questions: questions.data,
    cvs: cvs.data,
    existingApplicationId: existing.data?.id ?? null,
  };
}

// My applications ------------------------------------------------------------------

export type ApplicationSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  location_or_link: string | null;
  status: SlotStatus;
};

export type ApplicationListItem = {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
  referred: boolean;
  jobTitle: string;
  companyName: string;
  hasProposedSlots: boolean;
  nextInterviewAt: string | null;
};

export async function getMyApplications(userId: string): Promise<ApplicationListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_applications")
    .select("id, status, created_at, referral_id, jobs(title, companies(name)), interview_slots(starts_at, status)")
    .eq("applicant_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load applications");

  const now = Date.now();
  return data.map((row) => {
    const upcoming = row.interview_slots.filter((slot) => new Date(slot.starts_at).getTime() > now);
    const open = !["withdrawn", "rejected", "hired"].includes(row.status);
    const selected = upcoming
      .filter((slot) => slot.status === "selected")
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
    return {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      referred: row.referral_id !== null,
      jobTitle: row.jobs?.title ?? "",
      companyName: row.jobs?.companies?.name ?? "",
      hasProposedSlots: open && upcoming.some((slot) => slot.status === "proposed"),
      nextInterviewAt: open && selected ? selected.starts_at : null,
    };
  });
}

export type ApplicationDetail = {
  id: string;
  status: ApplicationStatus;
  createdAt: string;
  coverNote: string | null;
  referred: boolean;
  job: { id: string; title: string; companyName: string };
  cvFileName: string | null;
  answers: { question: string; answer: string }[];
  history: { id: string; to_status: ApplicationStatus; from_status: ApplicationStatus | null; created_at: string }[];
  slots: ApplicationSlot[];
};

export async function getMyApplication(applicationId: string, userId: string): Promise<ApplicationDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_applications")
    .select(
      `id, status, created_at, cover_note, referral_id,
       jobs(id, title, companies(name)),
       cvs(file_name),
       application_answers(answer, job_screening_questions(question, position)),
       application_status_history(id, from_status, to_status, created_at),
       interview_slots(id, starts_at, ends_at, location_or_link, status)`,
    )
    .eq("id", applicationId)
    .eq("applicant_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load the application");
  if (!data) return null;

  const now = Date.now();
  return {
    id: data.id,
    status: data.status,
    createdAt: data.created_at,
    coverNote: data.cover_note,
    referred: data.referral_id !== null,
    job: { id: data.jobs?.id ?? "", title: data.jobs?.title ?? "", companyName: data.jobs?.companies?.name ?? "" },
    cvFileName: data.cvs?.file_name ?? null,
    answers: data.application_answers
      .map((row) => ({
        question: row.job_screening_questions?.question ?? "",
        answer: row.answer,
        position: row.job_screening_questions?.position ?? 0,
      }))
      .sort((a, b) => a.position - b.position)
      .map(({ question, answer }) => ({ question, answer })),
    history: [...data.application_status_history].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    // Cancelled slots and proposals already in the past are not shown to the applicant.
    slots: data.interview_slots
      .filter((slot) => slot.status === "selected" || (slot.status === "proposed" && new Date(slot.starts_at).getTime() > now))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
  };
}

// Referrals ----------------------------------------------------------------------

// companyId is null for an organisation the member typed that is not on NextStep yet (D-046).
export type Affiliation = { id: string; companyId: string | null; companyName: string; confirmed: boolean; onNextStep: boolean };
export type CompanyOption = { id: string; name: string };
export type ReferableJob = { id: string; title: string; companyId: string; referral: { id: string; note: string | null } | null };

export type ReferralsData = {
  affiliations: Affiliation[];
  companies: CompanyOption[];
  jobs: ReferableJob[];
};

export async function getReferralsData(userId: string): Promise<ReferralsData> {
  const supabase = await createClient();
  const [affiliations, companies, referrals] = await Promise.all([
    supabase
      .from("company_affiliations")
      .select("id, company_id, organisation_name, confirmed_by_company_at, companies(name)")
      .eq("user_id", userId)
      .order("created_at"),
    supabase
      .from("companies")
      .select("id, name")
      .eq("verification_status", "approved")
      .is("hidden_at", null)
      .order("name"),
    supabase.from("referrals").select("id, job_id, note").eq("referrer_id", userId),
  ]);
  if (affiliations.error || companies.error || referrals.error) throw new Error("Could not load referrals");

  const companyIds = affiliations.data.flatMap((row) => (row.company_id ? [row.company_id] : []));
  const jobs = companyIds.length
    ? await supabase
        .from("jobs")
        .select("id, title, company_id")
        .eq("status", "published")
        .is("hidden_at", null)
        .in("company_id", companyIds)
        .order("published_at", { ascending: false })
    : { data: [], error: null };
  if (jobs.error) throw new Error("Could not load jobs");

  const referralByJob = new Map(referrals.data.map((row) => [row.job_id, { id: row.id, note: row.note }]));
  const affiliated = new Set(companyIds);

  return {
    affiliations: affiliations.data.map((row) => ({
      id: row.id,
      companyId: row.company_id,
      companyName: row.companies?.name ?? row.organisation_name ?? "",
      confirmed: row.confirmed_by_company_at !== null,
      onNextStep: row.company_id !== null,
    })),
    companies: companies.data.filter((company) => !affiliated.has(company.id)),
    jobs: jobs.data.map((job) => ({
      id: job.id,
      title: job.title,
      companyId: job.company_id,
      referral: referralByJob.get(job.id) ?? null,
    })),
  };
}
