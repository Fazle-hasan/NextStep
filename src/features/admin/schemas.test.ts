import { describe, expect, it } from "vitest";

import { jobReviewSchema, reviewSchema } from "./schemas";

const id = "00000000-0000-4000-8000-000000000001";

describe("admin review schemas", () => {
  it("approves without a reason", () => {
    expect(reviewSchema.safeParse({ id, approve: true }).success).toBe(true);
  });

  it("requires a reason to reject a verification request", () => {
    expect(reviewSchema.safeParse({ id, approve: false }).success).toBe(false);
    expect(reviewSchema.safeParse({ id, approve: false, reason: "no" }).success).toBe(false);
    expect(reviewSchema.safeParse({ id, approve: false, reason: "Documents do not match" }).success).toBe(true);
  });

  it("lets a job be sent back without a reason", () => {
    expect(jobReviewSchema.safeParse({ id, approve: false }).success).toBe(true);
  });

  it("rejects malformed ids", () => {
    expect(reviewSchema.safeParse({ id: "abc", approve: true }).success).toBe(false);
  });
});
