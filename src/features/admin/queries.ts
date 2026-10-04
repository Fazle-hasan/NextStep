import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

import { adminStrings } from "./strings";

// Admin-only reads. RLS returns nothing to non-admins; the admin layout also hides these pages.

export type PendingVerification = {
  id: string;
  kind: Enums<"verification_kind">;
  applicantNote: string | null;
  createdAt: string;
  requesterName: string;
  company: { name: string; slug: string; industry: string | null; website: string | null; description: string | null } | null;
  // Set for mentor requests once the applicant has created a mentor profile.
  mentor: { headline: string; yearsExperience: number; industries: string[]; sessionTypes: Enums<"session_type">[] } | null;
  // Set for buddy requests once the applicant has created a buddy profile.
  buddy: { cityName: string | null; helpTypes: Enums<"relocation_need">[]; bio: string | null } | null;
  // Set for flat-lister ID badge requests.
  lister: { listingCount: number } | null;
};

function uniqueIds(requests: { kind: Enums<"verification_kind">; user_id: string }[], kind: Enums<"verification_kind">): string[] {
  return [...new Set(requests.flatMap((r) => (r.kind === kind ? [r.user_id] : [])))];
}

export async function getPendingVerifications(): Promise<PendingVerification[]> {
  const supabase = await createClient();
  const { data: requests, error } = await supabase
    .from("verification_requests")
    .select("id, kind, subject_id, user_id, applicant_note, created_at")
    .eq("status", "pending")
    .order("created_at");
  if (error) throw new Error("Could not load verification requests");
  if (requests.length === 0) return [];

  const companyIds = requests.flatMap((r) => (r.kind === "company" && r.subject_id ? [r.subject_id] : []));
  const mentorIds = uniqueIds(requests, "mentor");
  const buddyIds = uniqueIds(requests, "buddy");
  const listerIds = uniqueIds(requests, "flat_lister_id");
  const none = Promise.resolve({ data: [] });

  const [{ data: people }, { data: companies }, { data: mentors }, { data: buddies }, { data: listings }, { data: cities }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", [...new Set(requests.map((r) => r.user_id))]),
      companyIds.length
        ? supabase.from("companies").select("id, name, slug, industry, website, description").in("id", companyIds)
        : none,
      mentorIds.length
        ? supabase.from("mentor_profiles").select("user_id, headline, years_experience, industries, session_types").in("user_id", mentorIds)
        : none,
      buddyIds.length ? supabase.from("buddy_profiles").select("user_id, city_id, help_types, bio").in("user_id", buddyIds) : none,
      listerIds.length
        ? supabase.from("flat_listings").select("lister_id").in("lister_id", listerIds).is("deleted_at", null)
        : none,
      buddyIds.length ? supabase.from("cities").select("id, name") : none,
    ]);

  return requests.map((r) => {
    const company = companies?.find((c) => c.id === r.subject_id);
    const mentor = r.kind === "mentor" ? mentors?.find((m) => m.user_id === r.user_id) : undefined;
    const buddy = r.kind === "buddy" ? buddies?.find((b) => b.user_id === r.user_id) : undefined;
    return {
      id: r.id,
      kind: r.kind,
      applicantNote: r.applicant_note,
      createdAt: r.created_at,
      requesterName: people?.find((p) => p.id === r.user_id)?.full_name ?? adminStrings.unnamed,
      company: company
        ? { name: company.name, slug: company.slug, industry: company.industry, website: company.website, description: company.description }
        : null,
      mentor: mentor
        ? {
            headline: mentor.headline,
            yearsExperience: mentor.years_experience,
            industries: mentor.industries,
            sessionTypes: mentor.session_types,
          }
        : null,
      buddy: buddy
        ? { cityName: cities?.find((c) => c.id === buddy.city_id)?.name ?? null, helpTypes: buddy.help_types, bio: buddy.bio }
        : null,
      lister:
        r.kind === "flat_lister_id"
          ? { listingCount: (listings ?? []).filter((l) => l.lister_id === r.user_id).length }
          : null,
    };
  });
}

export type PendingJob = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  companyName: string;
};

export async function getJobsPendingReview(): Promise<PendingJob[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("id, title, description, created_at, companies(name)")
    .eq("status", "pending_review")
    .order("updated_at");
  if (error) throw new Error("Could not load jobs waiting for review");
  return data.map((j) => ({
    id: j.id,
    title: j.title,
    description: j.description,
    createdAt: j.created_at,
    companyName: j.companies?.name ?? "Unknown company",
  }));
}

export type AdminCounts = { verifications: number; jobs: number; reports: number; placeSuggestions: number };

export async function getAdminCounts(): Promise<AdminCounts> {
  const supabase = await createClient();
  const [v, j, r, p] = await Promise.all([
    supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("place_suggestions").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  return { verifications: v.count ?? 0, jobs: j.count ?? 0, reports: r.count ?? 0, placeSuggestions: p.count ?? 0 };
}
