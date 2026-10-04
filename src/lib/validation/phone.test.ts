import { describe, expect, it } from "vitest";

import { indianPhoneSchema, normalizeIndianPhone } from "./phone";

describe("normalizeIndianPhone", () => {
  it.each([
    ["9876543210", "+919876543210"],
    ["98765 43210", "+919876543210"],
    ["098765-43210", "+919876543210"],
    ["+91 98765 43210", "+919876543210"],
    ["919876543210", "+919876543210"],
    ["(+91) 6000000000", "+916000000000"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeIndianPhone(input)).toBe(expected);
  });

  it.each(["", "12345", "5876543210", "+15551234567", "98765432101", "abcdefghij", "+91 0000000001"])(
    "rejects %s",
    (input) => {
      expect(normalizeIndianPhone(input)).toBeNull();
    },
  );
});

describe("indianPhoneSchema", () => {
  it("outputs E.164", () => {
    expect(indianPhoneSchema.parse(" 98765 43210 ")).toBe("+919876543210");
  });

  it("fails with a friendly message", () => {
    const result = indianPhoneSchema.safeParse("123");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/Indian mobile number/);
  });
});
