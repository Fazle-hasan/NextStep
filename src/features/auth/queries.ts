import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type { AppRole } from "@/lib/sections";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Viewer = {
  id: string;
  profile: Tables<"profiles">;
  roles: AppRole[];
};

// The signed-in user with profile and roles, or null. Cached per request.
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const [{ data: profile }, { data: roleRows }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  if (!profile) return null;

  return { id: userId, profile, roles: (roleRows ?? []).map((r) => r.role) };
});

// Where to send a user right after sign-in.
export async function postSignInPath(userId: string, next: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("onboarding_completed_at").eq("id", userId).maybeSingle();
  if (!data?.onboarding_completed_at) {
    return `/onboarding?next=${encodeURIComponent(next)}`;
  }
  return next;
}

// For pages that need a signed-in, onboarded user. Sends everyone else to sign-in or onboarding and back.
export async function requireViewer(next: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (!viewer.profile.onboarding_completed_at) redirect(`/onboarding?next=${encodeURIComponent(next)}`);
  return viewer;
}
