import "server-only";

import type { Json } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

import { AUDIT_PAGE_SIZE, type AuditFilters } from "./schemas";

export type AuditEntry = {
  id: string;
  createdAt: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  targetTable: string | null;
  targetId: string | null;
  details: Json;
};

// Admin-only: RLS on audit_log returns rows to admins alone.
export async function getAuditEntries(filters: AuditFilters): Promise<{ entries: AuditEntry[]; hasMore: boolean }> {
  const supabase = await createClient();
  const offset = (filters.page - 1) * AUDIT_PAGE_SIZE;
  let query = supabase
    .from("audit_log")
    .select("id, created_at, actor_id, action, target_table, target_id, details")
    .order("created_at", { ascending: false })
    .range(offset, offset + AUDIT_PAGE_SIZE);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.actor) query = query.eq("actor_id", filters.actor);
  const { data, error } = await query;
  if (error) throw new Error("Could not load the audit log");

  const rows = data.slice(0, AUDIT_PAGE_SIZE);
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((id): id is string => id !== null))];
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return {
    entries: rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      actorId: r.actor_id,
      actorName: r.actor_id ? (names.get(r.actor_id) ?? null) : null,
      action: r.action,
      targetTable: r.target_table,
      targetId: r.target_id,
      details: r.details,
    })),
    hasMore: data.length > AUDIT_PAGE_SIZE,
  };
}

// Options for the filters: actions seen in the latest 1000 rows, and the admins.
export async function getAuditFilterOptions(): Promise<{ actions: string[]; admins: { id: string; name: string | null }[] }> {
  const supabase = await createClient();
  const [{ data: recent }, { data: adminRoles }] = await Promise.all([
    supabase.from("audit_log").select("action").order("created_at", { ascending: false }).limit(1000),
    supabase.from("user_roles").select("user_id").eq("role", "admin"),
  ]);
  const adminIds = (adminRoles ?? []).map((r) => r.user_id);
  const { data: profiles } = adminIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", adminIds)
    : { data: [] };

  return {
    actions: [...new Set((recent ?? []).map((r) => r.action))].sort(),
    admins: adminIds
      .map((id) => ({ id, name: (profiles ?? []).find((p) => p.id === id)?.full_name ?? null }))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")),
  };
}
