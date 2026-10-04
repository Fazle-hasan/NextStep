import { describe, expect, it } from "vitest";

import { analyticsFiltersSchema, analyticsResultSchema, isoDaysAgo } from "./schemas";

describe("analyticsFiltersSchema", () => {
  it("keeps valid dates and a city id", () => {
    const city = "00000000-0000-4000-8000-000000000001";
    expect(analyticsFiltersSchema.parse({ from: "2026-09-01", to: "2026-09-30", city })).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
      city,
    });
  });

  it("drops invalid values instead of failing", () => {
    expect(analyticsFiltersSchema.parse({ from: "yesterday", to: ["2026-13-45"], city: "mumbai" })).toEqual({
      from: undefined,
      to: undefined,
      city: undefined,
    });
  });
});

describe("isoDaysAgo", () => {
  it("counts back in India time", () => {
    // 20:00 UTC is already the next day in India.
    expect(isoDaysAgo(0, new Date("2026-10-04T20:00:00Z"))).toBe("2026-10-05");
    expect(isoDaysAgo(7, new Date("2026-10-04T06:00:00Z"))).toBe("2026-09-27");
  });
});

describe("analyticsResultSchema", () => {
  const base = {
    from: "2026-09-05",
    to: "2026-10-04",
    signups: 12,
    signups_by_role: { job_seeker: 8, mentor: 2, not_a_role: 1 },
    jobs_posted: 3,
    applications: "5",
    hires: 1,
    mentorship_sessions_booked: 4,
    mentorship_sessions_completed: 2,
    relocation_requests_opened: 2,
    relocation_requests_closed: 1,
    listings_created: 6,
    active_listings: 5,
    open_reports: 0,
    pending_verifications: 3,
    by_city: [
      { city_id: "c1", city: "Mumbai", signups: 7, jobs_posted: 2, applications: 4, relocation_requests: 1, active_listings: 4 },
    ],
  };

  it("parses the RPC result and coerces numbers", () => {
    const result = analyticsResultSchema.parse(base);
    expect(result.applications).toBe(5);
    expect(result.by_city[0]?.city).toBe("Mumbai");
  });

  it("ignores unknown roles", () => {
    expect(analyticsResultSchema.parse(base).signups_by_role).toEqual({ job_seeker: 8, mentor: 2 });
  });

  it("rejects a malformed result", () => {
    expect(analyticsResultSchema.safeParse({ ...base, by_city: "nope" }).success).toBe(false);
  });
});
