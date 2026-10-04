import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CityOption = { id: string; name: string };

export async function getActiveCities(): Promise<CityOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cities").select("id, name").eq("is_active", true).order("name");
  if (error) throw new Error("Could not load cities");
  return data;
}

export async function hasPhoneOnFile(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("profile_private").select("phone").eq("user_id", userId).maybeSingle();
  return Boolean(data?.phone);
}

export type PendingVerification = { id: string; kind: string; status: string; created_at: string };

export async function getMyVerificationRequests(userId: string): Promise<PendingVerification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("verification_requests")
    .select("id, kind, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load verification status");
  return data;
}
