import { describe, expect, it } from "vitest";

import { onboardingSchema } from "./schemas";

const valid = {
  fullName: "  Test User ",
  gender: "female",
  cityId: "3f1c1e1a-6b7a-4c5d-9e8f-0a1b2c3d4e5f",
  intents: ["find_job"],
};

describe("onboardingSchema", () => {
  it("accepts a minimal valid profile and trims the name", () => {
    const parsed = onboardingSchema.parse(valid);
    expect(parsed.fullName).toBe("Test User");
    expect(parsed.phone).toBeUndefined();
  });

  it("treats an empty phone as 'keep existing'", () => {
    expect(onboardingSchema.parse({ ...valid, phone: "" }).phone).toBeUndefined();
  });

  it("normalizes a provided phone", () => {
    expect(onboardingSchema.parse({ ...valid, phone: "09876543210" }).phone).toBe("+919876543210");
  });

  it("rejects an invalid phone", () => {
    expect(onboardingSchema.safeParse({ ...valid, phone: "12345" }).success).toBe(false);
  });

  it("requires at least one intent", () => {
    expect(onboardingSchema.safeParse({ ...valid, intents: [] }).success).toBe(false);
  });

  it("rejects unknown intents and genders", () => {
    expect(onboardingSchema.safeParse({ ...valid, intents: ["admin"] }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...valid, gender: "other" }).success).toBe(false);
  });

  it("requires a uuid city", () => {
    expect(onboardingSchema.safeParse({ ...valid, cityId: "mumbai" }).success).toBe(false);
  });

  it("caps the verification note at 1000 characters", () => {
    expect(onboardingSchema.safeParse({ ...valid, verificationNote: "x".repeat(1001) }).success).toBe(false);
  });
});
