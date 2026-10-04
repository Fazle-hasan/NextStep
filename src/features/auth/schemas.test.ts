import { describe, expect, it } from "vitest";

import {
  emailOtpRequestSchema,
  emailOtpVerifySchema,
  passwordSignInSchema,
  phoneOtpRequestSchema,
  phoneOtpVerifySchema,
  setPasswordSchema,
} from "./schemas";

describe("auth schemas", () => {
  it("normalizes phone numbers", () => {
    expect(phoneOtpRequestSchema.parse({ phone: "98765 43210" })).toEqual({ phone: "+919876543210" });
  });

  it("rejects non-Indian phone numbers", () => {
    expect(phoneOtpRequestSchema.safeParse({ phone: "+15551234567" }).success).toBe(false);
  });

  it("requires a 6-digit code", () => {
    expect(phoneOtpVerifySchema.safeParse({ phone: "9876543210", token: "123456" }).success).toBe(true);
    expect(phoneOtpVerifySchema.safeParse({ phone: "9876543210", token: "12345" }).success).toBe(false);
    expect(emailOtpVerifySchema.safeParse({ email: "a@b.co", token: "12a456" }).success).toBe(false);
  });

  it("trims and lowercases email", () => {
    expect(emailOtpRequestSchema.parse({ email: "  Test@Example.COM " }).email).toBe("test@example.com");
  });

  it("rejects invalid email", () => {
    expect(emailOtpRequestSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });
});

describe("password schemas", () => {
  it("needs an email and a password to sign in", () => {
    expect(passwordSignInSchema.safeParse({ email: " A@B.co ", password: "x" }).success).toBe(true);
    expect(passwordSignInSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(passwordSignInSchema.safeParse({ email: "not-an-email", password: "secret" }).success).toBe(false);
  });

  it("requires 8 to 72 characters and a matching repeat", () => {
    expect(setPasswordSchema.safeParse({ password: "long enough", confirm: "long enough" }).success).toBe(true);
    expect(setPasswordSchema.safeParse({ password: "short", confirm: "short" }).success).toBe(false);
    expect(setPasswordSchema.safeParse({ password: "x".repeat(73), confirm: "x".repeat(73) }).success).toBe(false);
    const mismatch = setPasswordSchema.safeParse({ password: "long enough", confirm: "long enougH" });
    expect(mismatch.success).toBe(false);
    expect(mismatch.error?.issues[0]?.path).toEqual(["confirm"]);
  });
});
