import { z } from "zod";

import { lakhToPaise } from "@/lib/utils/money";
import type { Database, Enums } from "@/types/database";

import { EXPERIENCE_LEVEL_LABELS, JOB_TYPE_LABELS, WORK_MODE_LABELS } from "../labels";

import { searchStrings as s } from "./strings";

export const PAGE_SIZE = 20;
export const RADIUS_OPTIONS = [5, 10, 25, 50] as const;
export const POSTED_OPTIONS = [1, 7, 30] as const;

const JOB_TYPES = Object.keys(JOB_TYPE_LABELS) as [Enums<"job_type">, ...Enums<"job_type">[]];
const WORK_MODES = Object.keys(WORK_MODE_LABELS) as [Enums<"work_mode">, ...Enums<"work_mode">[]];
const LEVELS = Object.keys(EXPERIENCE_LEVEL_LABELS) as [Enums<"experience_level">, ...Enums<"experience_level">[]];

// URL params arrive as string | string[] | undefined. Bad values are dropped instead of failing the page.
const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);
const list = (value: unknown) => (value == null || value === "" ? [] : Array.isArray(value) ? value : [value]);

function enumList<T extends string>(values: readonly [T, ...T[]]) {
  return z.preprocess(
    (value) => [...new Set(list(value).filter((v): v is T => (values as readonly unknown[]).includes(v)))],
    z.array(z.enum(values)),
  );
}

function oneOf<T extends number>(options: readonly T[]) {
  return z.preprocess((value) => {
    const n = Number(first(value));
    return (options as readonly number[]).includes(n) ? n : undefined;
  }, z.number().optional()) as z.ZodType<T | undefined>;
}

function numberIn(min: number, max: number) {
  return z.preprocess((value) => {
    const raw = first(value);
    if (raw == null || raw === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
  }, z.number().optional());
}

const filterShape = {
  q: z.preprocess((value) => {
    const text = typeof first(value) === "string" ? (first(value) as string).trim().slice(0, 100) : "";
    return text || undefined;
  }, z.string().optional()),
  city: z.preprocess((value) => (z.guid().safeParse(first(value)).success ? first(value) : undefined), z.string().optional()),
  types: enumList(JOB_TYPES),
  modes: enumList(WORK_MODES),
  levels: enumList(LEVELS),
  // Minimum annual salary in lakh rupees.
  minSalary: numberIn(0.1, 1000),
  posted: oneOf(POSTED_OPTIONS),
  leap: z.preprocess((value) => first(value) === "1" || first(value) === "on" || first(value) === true, z.boolean()),
  lat: numberIn(-90, 90),
  lng: numberIn(-180, 180),
  radius: oneOf(RADIUS_OPTIONS),
};

// Filters as stored in a saved search (no page number).
export const jobFiltersSchema = z.object(filterShape).transform((f) => {
  // Distance needs a full point; default the radius when only the point is given.
  const hasPoint = f.lat !== undefined && f.lng !== undefined;
  return { ...f, lat: hasPoint ? f.lat : undefined, lng: hasPoint ? f.lng : undefined, radius: hasPoint ? (f.radius ?? 10) : undefined };
});

export type JobFilters = z.output<typeof jobFiltersSchema>;

const pageSchema = z.preprocess((value) => {
  const n = Number(first(value));
  return Number.isInteger(n) && n >= 1 && n <= 500 ? n : 1;
}, z.number());

export type RawParams = Record<string, string | string[] | undefined>;

export function parseJobSearch(raw: RawParams | unknown): { filters: JobFilters; page: number } {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return { filters: jobFiltersSchema.parse(source), page: pageSchema.parse(source.page) };
}

// Query string for /jobs (omits empty values so URLs stay short).
export function filtersToQuery(filters: JobFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.city) params.set("city", filters.city);
  filters.types.forEach((v) => params.append("types", v));
  filters.modes.forEach((v) => params.append("modes", v));
  filters.levels.forEach((v) => params.append("levels", v));
  if (filters.minSalary !== undefined) params.set("minSalary", String(filters.minSalary));
  if (filters.posted !== undefined) params.set("posted", String(filters.posted));
  if (filters.leap) params.set("leap", "1");
  if (filters.lat !== undefined && filters.lng !== undefined) {
    params.set("lat", String(filters.lat));
    params.set("lng", String(filters.lng));
    params.set("radius", String(filters.radius ?? 10));
  }
  if (page > 1) params.set("page", String(page));
  return params.toString();
}

export function jobsHref(filters: JobFilters, page = 1): string {
  const query = filtersToQuery(filters, page);
  return query ? `/jobs?${query}` : "/jobs";
}

type SearchArgs = Database["public"]["Functions"]["search_jobs"]["Args"];

export function filtersToRpcArgs(filters: JobFilters, page: number): SearchArgs {
  return {
    p_q: filters.q,
    p_city_id: filters.city,
    p_job_types: filters.types.length ? filters.types : undefined,
    p_work_modes: filters.modes.length ? filters.modes : undefined,
    p_levels: filters.levels.length ? filters.levels : undefined,
    p_salary_min: filters.minSalary !== undefined ? lakhToPaise(filters.minSalary) : undefined,
    p_posted_within_days: filters.posted,
    p_leap_friendly: filters.leap || undefined,
    p_lat: filters.lat,
    p_lng: filters.lng,
    p_radius_km: filters.radius,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  };
}

// Number of filters in use, not counting the keyword.
export function countActiveFilters(filters: JobFilters): number {
  return (
    (filters.city ? 1 : 0) +
    filters.types.length +
    filters.modes.length +
    filters.levels.length +
    (filters.minSalary !== undefined ? 1 : 0) +
    (filters.posted !== undefined ? 1 : 0) +
    (filters.leap ? 1 : 0) +
    (filters.lat !== undefined ? 1 : 0)
  );
}

// "react · Mumbai · Full-time, Contract · Remote · From ₹8 lakh · Last 7 days"
export function summarizeFilters(filters: JobFilters, cityNames: Record<string, string> = {}): string {
  const parts: string[] = [];
  if (filters.q) parts.push(`“${filters.q}”`);
  if (filters.city && cityNames[filters.city]) parts.push(cityNames[filters.city]!);
  if (filters.types.length) parts.push(filters.types.map((v) => JOB_TYPE_LABELS[v]).join(", "));
  if (filters.modes.length) parts.push(filters.modes.map((v) => WORK_MODE_LABELS[v]).join(", "));
  if (filters.levels.length) parts.push(filters.levels.map((v) => EXPERIENCE_LEVEL_LABELS[v]).join(", "));
  if (filters.minSalary !== undefined) parts.push(`From ₹${filters.minSalary} lakh a year`);
  if (filters.posted !== undefined) parts.push(s.postedOptions[filters.posted] ?? "");
  if (filters.leap) parts.push("LEAP-friendly");
  if (filters.lat !== undefined) parts.push(`Within ${filters.radius ?? 10} km of a saved location`);
  return parts.filter(Boolean).join(" · ") || s.saved.allJobs;
}

// Server action inputs -------------------------------------------------------------

export const toggleSavedJobSchema = z.object({ jobId: z.guid(), save: z.boolean() });

export const saveSearchSchema = z.object({
  name: z.string().trim().min(1, s.saveSearch.nameRequired).max(80, s.saveSearch.nameRequired),
  daily: z.boolean(),
  filters: jobFiltersSchema,
});

export const setSearchAlertSchema = z.object({ id: z.guid(), daily: z.boolean() });
export const deleteSavedSearchSchema = z.object({ id: z.guid() });
