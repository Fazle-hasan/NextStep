import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type SeekerProfileData = {
  profile: Tables<"seeker_profiles"> | null;
  salary: Tables<"seeker_salary_prefs"> | null;
  skillIds: string[];
  experiences: Tables<"experiences">[];
  educations: Tables<"educations">[];
  cvs: Tables<"cvs">[];
};

// Everything the /profile page shows, for the signed-in user.
export async function getSeekerProfileData(userId: string): Promise<SeekerProfileData> {
  const supabase = await createClient();
  const [profile, salary, skills, experiences, educations, cvs] = await Promise.all([
    supabase.from("seeker_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("seeker_salary_prefs").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("profile_skills").select("skill_id").eq("user_id", userId),
    supabase
      .from("experiences")
      .select("*")
      .eq("user_id", userId)
      .order("is_current", { ascending: false })
      .order("start_date", { ascending: false }),
    supabase
      .from("educations")
      .select("*")
      .eq("user_id", userId)
      .order("end_year", { ascending: false, nullsFirst: true }),
    supabase.from("cvs").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);

  const failed = [profile, salary, skills, experiences, educations, cvs].some((result) => result.error);
  if (failed) throw new Error("Could not load your job profile");

  return {
    profile: profile.data,
    salary: salary.data,
    skillIds: (skills.data ?? []).map((row) => row.skill_id),
    experiences: experiences.data ?? [],
    educations: educations.data ?? [],
    cvs: cvs.data ?? [],
  };
}

export type ProfileGap = "basics" | "skills" | "experience" | "education" | "cv";

// Which sections are still empty (drives the completeness hint).
export function profileGaps(data: SeekerProfileData): ProfileGap[] {
  const gaps: ProfileGap[] = [];
  if (!data.profile?.headline) gaps.push("basics");
  if (data.skillIds.length === 0) gaps.push("skills");
  if (data.experiences.length === 0) gaps.push("experience");
  if (data.educations.length === 0) gaps.push("education");
  if (data.cvs.length === 0) gaps.push("cv");
  return gaps;
}
