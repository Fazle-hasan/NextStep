import { describe, expect, it } from "vitest";

import { blockSchema, reportSchema } from "./schemas";

const id = "3f1c1e1a-6b7a-4c5d-9e8f-0a1b2c3d4e5f";

describe("reportSchema", () => {
  it("accepts a valid report", () => {
    expect(reportSchema.safeParse({ targetType: "user", targetId: id, reason: "spam" }).success).toBe(true);
  });

  it("rejects unknown target types and reasons", () => {
    expect(reportSchema.safeParse({ targetType: "planet", targetId: id, reason: "spam" }).success).toBe(false);
    expect(reportSchema.safeParse({ targetType: "user", targetId: id, reason: "boredom" }).success).toBe(false);
  });

  it("requires a uuid target", () => {
    expect(reportSchema.safeParse({ targetType: "job", targetId: "123", reason: "spam" }).success).toBe(false);
  });

  it("caps details at 2000 characters", () => {
    const base = { targetType: "message", targetId: id, reason: "other" };
    expect(reportSchema.safeParse({ ...base, details: "x".repeat(2000) }).success).toBe(true);
    expect(reportSchema.safeParse({ ...base, details: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("blockSchema", () => {
  it("requires a uuid", () => {
    expect(blockSchema.safeParse({ userId: id }).success).toBe(true);
    expect(blockSchema.safeParse({ userId: "nope" }).success).toBe(false);
  });
});
