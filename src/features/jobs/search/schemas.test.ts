import { describe, expect, it } from "vitest";

import {
  countActiveFilters,
  filtersToQuery,
  filtersToRpcArgs,
  jobsHref,
  parseJobSearch,
  saveSearchSchema,
  summarizeFilters,
  toggleSavedJobSchema,
} from "./schemas";

const CITY = "3f2c1a9e-6b1d-4c57-9a55-0c8d5f1e2a11";

describe("parseJobSearch", () => {
  it("returns empty filters and page 1 for no params", () => {
    const { filters, page } = parseJobSearch({});
    expect(page).toBe(1);
    expect(filters).toMatchObject({ types: [], modes: [], levels: [], leap: false });
    expect(filters.q).toBeUndefined();
    expect(countActiveFilters(filters)).toBe(0);
  });

  it("parses single and repeated params", () => {
    const { filters, page } = parseJobSearch({
      q: "  react  ",
      city: CITY,
      types: ["full_time", "contract"],
      modes: "remote",
      levels: ["entry"],
      minSalary: "8",
      posted: "7",
      leap: "1",
      page: "3",
    });
    expect(filters).toMatchObject({
      q: "react",
      city: CITY,
      types: ["full_time", "contract"],
      modes: ["remote"],
      levels: ["entry"],
      minSalary: 8,
      posted: 7,
      leap: true,
    });
    expect(page).toBe(3);
    expect(countActiveFilters(filters)).toBe(8);
  });

  it("drops invalid values instead of failing", () => {
    const { filters, page } = parseJobSearch({
      city: "not-a-uuid",
      types: ["full_time", "astronaut", "full_time"],
      minSalary: "-5",
      posted: "9",
      radius: "7",
      page: "0",
      q: ["a", "b"],
    });
    expect(filters.city).toBeUndefined();
    expect(filters.types).toEqual(["full_time"]);
    expect(filters.minSalary).toBeUndefined();
    expect(filters.posted).toBeUndefined();
    expect(filters.q).toBe("a");
    expect(page).toBe(1);
  });

  it("needs both coordinates for a distance filter and defaults the radius", () => {
    expect(parseJobSearch({ lat: "19.07" }).filters).toMatchObject({ lat: undefined, lng: undefined, radius: undefined });
    expect(parseJobSearch({ lat: "19.07", lng: "72.87" }).filters).toMatchObject({ lat: 19.07, lng: 72.87, radius: 10 });
    expect(parseJobSearch({ lat: "19.07", lng: "72.87", radius: "25" }).filters.radius).toBe(25);
    expect(parseJobSearch({ lat: "190", lng: "72.87" }).filters.lat).toBeUndefined();
    expect(parseJobSearch({ radius: "25" }).filters.radius).toBeUndefined();
  });

  it("copes with non-object input", () => {
    expect(parseJobSearch(null).page).toBe(1);
    expect(parseJobSearch("x").filters.types).toEqual([]);
  });
});

describe("query strings", () => {
  it("round-trips filters through the URL", () => {
    const { filters } = parseJobSearch({ q: "data", types: ["full_time", "internship"], leap: "1", lat: "17.4", lng: "78.4", radius: "5" });
    const query = filtersToQuery(filters, 2);
    const raw: Record<string, string | string[]> = {};
    for (const key of new Set(new URLSearchParams(query).keys())) {
      const values = new URLSearchParams(query).getAll(key);
      raw[key] = values.length > 1 ? values : values[0]!;
    }
    const again = parseJobSearch(raw);
    expect(again.filters).toEqual(filters);
    expect(again.page).toBe(2);
  });

  it("builds a clean href when nothing is set", () => {
    expect(jobsHref(parseJobSearch({}).filters)).toBe("/jobs");
    expect(jobsHref(parseJobSearch({ q: "a b" }).filters)).toBe("/jobs?q=a+b");
  });
});

describe("filtersToRpcArgs", () => {
  it("converts lakh to paise and pages to offsets", () => {
    const { filters } = parseJobSearch({ minSalary: "8", types: "full_time" });
    const args = filtersToRpcArgs(filters, 3);
    expect(args.p_salary_min).toBe(80_000_000);
    expect(args.p_job_types).toEqual(["full_time"]);
    expect(args.p_work_modes).toBeUndefined();
    expect(args.p_leap_friendly).toBeUndefined();
    expect(args.p_limit).toBe(20);
    expect(args.p_offset).toBe(40);
  });
});

describe("summarizeFilters", () => {
  it("describes filters in words", () => {
    const { filters } = parseJobSearch({ q: "react", city: CITY, modes: "remote", posted: "7" });
    expect(summarizeFilters(filters, { [CITY]: "Mumbai" })).toBe("“react” · Mumbai · Remote · Last 7 days");
  });

  it("falls back to 'All jobs'", () => {
    expect(summarizeFilters(parseJobSearch({}).filters)).toBe("All jobs");
  });
});

describe("action schemas", () => {
  it("validates saved job toggles", () => {
    expect(toggleSavedJobSchema.safeParse({ jobId: CITY, save: true }).success).toBe(true);
    expect(toggleSavedJobSchema.safeParse({ jobId: "x", save: true }).success).toBe(false);
  });

  it("requires a name for saved searches and normalises filters", () => {
    expect(saveSearchSchema.safeParse({ name: "  ", daily: false, filters: {} }).success).toBe(false);
    const parsed = saveSearchSchema.safeParse({ name: " My search ", daily: true, filters: { q: "x", types: ["bogus"] } });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("My search");
      expect(parsed.data.filters.types).toEqual([]);
    }
  });
});
