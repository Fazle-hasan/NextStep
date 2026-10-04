import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

// Admin-only reads. RLS returns nothing to non-admins; the admin layout also hides these pages.

export type PendingVerification = {
  id: string;
  kind: Enums<"verification_kind">;
  applicantNote: string | null;
  createdAt: string;
  requesterName: string;
  company: { name: string; slug: string; industry: string | null; website: string | null; description: string | null } | null;
};

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
  const [{ data: people }, { data: companies }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", [...new Set(requests.map((r) => r.user_id))]),
    companyIds.length
      ? supabase.from("companies").select("id, name, slug, industry, website, description").in("id", companyIds)
      : Promise.resolve({ data: [] }),
  ]);

  return requests.map((r) => {
    const company = companies?.find((c) => c.id === r.subject_id);
    return {
      id: r.id,
      kind: r.kind,
      applicantNote: r.applicant_note,
      createdAt: r.created_at,
      requesterName: people?.find((p) => p.id === r.user_id)?.full_name ?? "Unnamed user",
      company: company
        ? { name: company.name, slug: company.slug, industry: company.industry, website: company.website, description: company.description }
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

export async function getAdminCounts(): Promise<{ verifications: number; jobs: number }> {
  const supabase = await createClient();
  const [v, j] = await Promise.all([
    supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
  ]);
  return { verifications: v.count ?? 0, jobs: j.count ?? 0 };
}
