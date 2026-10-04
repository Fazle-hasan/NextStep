import { describe, expect, it } from "vitest";

import { emailOtpRequestSchema, emailOtpVerifySchema, phoneOtpRequestSchema, phoneOtpVerifySchema } from "./schemas";

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
