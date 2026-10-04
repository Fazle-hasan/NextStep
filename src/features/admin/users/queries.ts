import "server-only";

import type { AppRole } from "@/lib/sections";
import { createClient } from "@/lib/supabase/server";

import { likePattern, type UserSearch } from "./schemas";

// Admin-only reads. Never selects phone or email (those live in profile_private and auth).

export type AdminUser = {
  id: string;
  name: string | null;
  cityName: string | null;
  roles: AppRole[];
  joinedAt: string;
  suspendedAt: string | null;
};

const LIMIT = 50;

// Returns null when there is nothing to search for yet.
export async function searchUsers(search: UserSearch): Promise<AdminUser[] | null> {
  if (search.q.length < 2 && !search.suspended) return null;

  const supabase = await createClient();
  let query = supabase.from("profiles").select("id, full_name, city_id, created_at, suspended_at");
  if (search.q.length >= 2) query = query.ilike("full_name", likePattern(search.q));
  if (search.suspended) query = query.not("suspended_at", "is", null);
  const { data: profiles, error } = await query.order("created_at", { ascending: false }).limit(LIMIT);
  if (error) throw new Error("Could not load users");
  if (profiles.length === 0) return [];

  const [{ data: roles }, { data: cities }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("user_id, role")
      .in(
        "user_id",
        profiles.map((p) => p.id),
      ),
    supabase.from("cities").select("id, name"),
  ]);

  return profiles.map((p) => ({
    id: p.id,
    name: p.full_name,
    cityName: cities?.find((c) => c.id === p.city_id)?.name ?? null,
    roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
    joinedAt: p.created_at,
    suspendedAt: p.suspended_at,
  }));
}
