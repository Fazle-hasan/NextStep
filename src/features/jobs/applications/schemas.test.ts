import { describe, expect, it } from "vitest";

import {
  addAffiliationSchema,
  applySchema,
  createReferralSchema,
  isHttpUrl,
  parseReferralParam,
  slotSchema,
} from "./schemas";

const JOB = "11111111-1111-4111-8111-111111111111";
const CV = "22222222-2222-4222-8222-222222222222";
const Q1 = "33333333-3333-4333-8333-333333333333";
const Q2 = "44444444-4444-4444-8444-444444444444";

describe("applySchema", () => {
  it("accepts a minimal application", () => {
    const result = applySchema.safeParse({ jobId: JOB, cvId: CV });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.answers).toEqual({});
      expect(result.data.coverNote).toBeUndefined();
      expect(result.data.referralId).toBeUndefined();
    }
  });

  it("trims text and drops blank answers", () => {
    const result = applySchema.parse({
      jobId: JOB,
      cvId: CV,
      coverNote: "  Hello  ",
      answers: { [Q1]: " 4 years ", [Q2]: "   " },
      referralId: Q1,
    });
    expect(result.coverNote).toBe("Hello");
    expect(result.answers).toEqual({ [Q1]: "4 years" });
    expect(result.referralId).toBe(Q1);
  });

  it("turns an empty cover note into undefined", () => {
    expect(applySchema.parse({ jobId: JOB, cvId: CV, coverNote: "   " }).coverNote).toBeUndefined();
  });

  it("requires a CV", () => {
    expect(applySchema.safeParse({ jobId: JOB, cvId: "" }).success).toBe(false);
    expect(applySchema.safeParse({ jobId: JOB }).success).toBe(false);
  });

  it("rejects long text and bad ids", () => {
    expect(applySchema.safeParse({ jobId: JOB, cvId: CV, coverNote: "x".repeat(2001) }).success).toBe(false);
    expect(applySchema.safeParse({ jobId: JOB, cvId: CV, answers: { [Q1]: "x".repeat(1001) } }).success).toBe(false);
    expect(applySchema.safeParse({ jobId: JOB, cvId: CV, answers: { "not-a-uuid": "x" } }).success).toBe(false);
    expect(applySchema.safeParse({ jobId: "nope", cvId: CV }).success).toBe(false);
    expect(applySchema.safeParse({ jobId: JOB, cvId: CV, referralId: "nope" }).success).toBe(false);
  });
});

describe("other schemas", () => {
  it("validates ids", () => {
    expect(slotSchema.safeParse({ slotId: JOB }).success).toBe(true);
    expect(slotSchema.safeParse({ slotId: "1" }).success).toBe(false);
    expect(addAffiliationSchema.safeParse({ companyId: "" }).success).toBe(false);
  });

  it("limits the referral note", () => {
    expect(createReferralSchema.parse({ jobId: JOB, note: " Good colleague " }).note).toBe("Good colleague");
    expect(createReferralSchema.parse({ jobId: JOB, note: "" }).note).toBeUndefined();
    expect(createReferralSchema.safeParse({ jobId: JOB, note: "x".repeat(501) }).success).toBe(false);
  });
});

describe("parseReferralParam", () => {
  it("returns a uuid or undefined", () => {
    expect(parseReferralParam(JOB)).toBe(JOB);
    expect(parseReferralParam([JOB, CV])).toBe(JOB);
    expect(parseReferralParam("abc")).toBeUndefined();
    expect(parseReferralParam(undefined)).toBeUndefined();
  });
});

describe("isHttpUrl", () => {
  it("only accepts http and https links", () => {
    expect(isHttpUrl("https://meet.example.test/abc")).toBe(true);
    expect(isHttpUrl("http://example.test")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("Office, 2nd floor")).toBe(false);
    expect(isHttpUrl("https://a.test and more text")).toBe(false);
  });
});
