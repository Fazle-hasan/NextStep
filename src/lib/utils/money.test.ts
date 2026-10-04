import { describe, expect, it } from "vitest";

import { formatAnnualSalary, lakhToPaise, paiseToLakh } from "./money";

describe("money", () => {
  it("converts lakh to paise and back", () => {
    expect(lakhToPaise(8)).toBe(80_000_000);
    expect(lakhToPaise(2.5)).toBe(25_000_000);
    expect(paiseToLakh(80_000_000)).toBe(8);
  });

  it("formats a salary range", () => {
    expect(formatAnnualSalary(80_000_000, 120_000_000)).toBe("₹8–12 lakh a year");
    expect(formatAnnualSalary(25_000_000, 25_000_000)).toBe("₹2.5 lakh a year");
  });

  it("formats one-sided ranges", () => {
    expect(formatAnnualSalary(80_000_000, null)).toBe("From ₹8 lakh a year");
    expect(formatAnnualSalary(null, 120_000_000)).toBe("Up to ₹12 lakh a year");
  });

  it("returns null when no salary is set", () => {
    expect(formatAnnualSalary(null, undefined)).toBeNull();
  });
});
