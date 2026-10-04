import "server-only";

import { dbErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

import { analyticsResultSchema, type AnalyticsFilters, type AnalyticsResult } from "./schemas";
import { analyticsStrings } from "./strings";

export type AnalyticsLoad = { ok: true; data: AnalyticsResult } | { ok: false; error: string };

// Admin-only: the RPC refuses everyone else.
export async function getAnalytics(filters: AnalyticsFilters): Promise<AnalyticsLoad> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_analytics", {
    p_from: filters.from,
    p_to: filters.to,
    p_city_id: filters.city,
  });
  if (error) {
    return { ok: false, error: dbErrorMessage(error, analyticsStrings.errors, analyticsStrings.errors.generic) };
  }
  const parsed = analyticsResultSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: analyticsStrings.errors.generic };
  return { ok: true, data: parsed.data };
}

export async function getCities(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("cities").select("id, name").eq("is_active", true).order("name");
  return data ?? [];
}
