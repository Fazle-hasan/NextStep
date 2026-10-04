import { describe, expect, it } from "vitest";

import { likePattern, suspensionSchema, userSearchSchema } from "./schemas";

const userId = "00000000-0000-4000-8000-000000000001";

describe("suspensionSchema", () => {
  it("requires a reason to suspend", () => {
    expect(suspensionSchema.safeParse({ userId, suspend: true }).success).toBe(false);
    expect(suspensionSchema.safeParse({ userId, suspend: true, reason: "no" }).success).toBe(false);
    expect(suspensionSchema.safeParse({ userId, suspend: true, reason: "Repeated harassment" }).success).toBe(true);
  });

  it("lifts a suspension without a reason", () => {
    expect(suspensionSchema.safeParse({ userId, suspend: false }).success).toBe(true);
  });

  it("rejects a bad id", () => {
    expect(suspensionSchema.safeParse({ userId: "nope", suspend: false }).success).toBe(false);
  });
});

describe("userSearchSchema", () => {
  it("reads the query and the suspended flag from search params", () => {
    expect(userSearchSchema.parse({ q: "  Ali ", suspended: "1" })).toEqual({ q: "Ali", suspended: true });
    expect(userSearchSchema.parse({ q: ["Sara", "x"] })).toEqual({ q: "Sara", suspended: false });
    expect(userSearchSchema.parse({})).toEqual({ q: "", suspended: false });
  });
});

describe("likePattern", () => {
  it("escapes wildcard characters", () => {
    expect(likePattern("a%b_c")).toBe("%a\\%b\\_c%");
  });
});
