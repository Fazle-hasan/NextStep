import { z } from "zod";

// Filters come from the URL (GET form). Invalid values fall back to "no filter".

function first(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

export const auditFiltersSchema = z.object({
  action: z.preprocess((v) => {
    const value = first(v);
    return typeof value === "string" && /^[a-z0-9_]{1,100}$/.test(value) ? value : undefined;
  }, z.string().optional()),
  actor: z.preprocess((v) => {
    const value = first(v);
    return typeof value === "string" && z.uuid().safeParse(value).success ? value : undefined;
  }, z.string().optional()),
  page: z.preprocess((v) => {
    const n = Number(first(v));
    return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : 1;
  }, z.number().int().min(1)),
});

export type AuditFilters = z.output<typeof auditFiltersSchema>;

export const AUDIT_PAGE_SIZE = 50;

export function auditHref(filters: AuditFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.action) params.set("action", filters.action);
  if (filters.actor) params.set("actor", filters.actor);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/audit?${query}` : "/admin/audit";
}
