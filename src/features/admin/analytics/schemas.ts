import { z } from "zod";

import { Constants } from "@/types/database";

// Filters come from the URL (GET form). Invalid values fall back to defaults instead of failing the page.

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function first(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function isValidDate(value: string): boolean {
  return DATE.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

const dateParam = z.preprocess((v) => {
  const value = first(v);
  return typeof value === "string" && isValidDate(value) ? value : undefined;
}, z.string().optional());

export const analyticsFiltersSchema = z.object({
  from: dateParam,
  to: dateParam,
  city: z.preprocess((v) => {
    const value = first(v);
    return typeof value === "string" && z.uuid().safeParse(value).success ? value : undefined;
  }, z.string().optional()),
});

export type AnalyticsFilters = z.output<typeof analyticsFiltersSchema>;

export const PRESET_DAYS = [7, 30, 90] as const;

// YYYY-MM-DD for "today minus n days" in India time.
export function isoDaysAgo(days: number, now: Date = new Date()): string {
  const india = new Date(now.getTime() + 330 * 60_000);
  india.setUTCDate(india.getUTCDate() - days);
  return india.toISOString().slice(0, 10);
}

const count = z.coerce.number().int().nonnegative();
const roleKeys = Constants.public.Enums.app_role;

// Shape returned by the admin_analytics RPC.
export const analyticsResultSchema = z.object({
  from: z.string(),
  to: z.string(),
  signups: count,
  signups_by_role: z.record(z.string(), count).transform((rec) =>
    Object.fromEntries(Object.entries(rec).filter(([role]) => (roleKeys as readonly string[]).includes(role))),
  ),
  jobs_posted: count,
  applications: count,
  hires: count,
  mentorship_sessions_booked: count,
  mentorship_sessions_completed: count,
  relocation_requests_opened: count,
  relocation_requests_closed: count,
  listings_created: count,
  active_listings: count,
  open_reports: count,
  pending_verifications: count,
  by_city: z.array(
    z.object({
      city_id: z.string(),
      city: z.string(),
      signups: count,
      jobs_posted: count,
      applications: count,
      relocation_requests: count,
      active_listings: count,
    }),
  ),
});

export type AnalyticsResult = z.output<typeof analyticsResultSchema>;

export const STAT_KEYS = [
  "signups",
  "jobs_posted",
  "applications",
  "hires",
  "mentorship_sessions_booked",
  "mentorship_sessions_completed",
  "relocation_requests_opened",
  "relocation_requests_closed",
  "listings_created",
  "active_listings",
  "open_reports",
  "pending_verifications",
] as const satisfies readonly (keyof AnalyticsResult)[];
