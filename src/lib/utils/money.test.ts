import { describe, expect, it } from "vitest";

import {
  formatAnnualSalary,
  formatMonthlyBudget,
  formatMonthlyRent,
  formatRupees,
  lakhToPaise,
  paiseToLakh,
  paiseToRupees,
  rupeesToPaise,
} from "./money";

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

describe("monthly amounts", () => {
  it("converts rupees to paise and back", () => {
    expect(rupeesToPaise(15000)).toBe(1_500_000);
    expect(paiseToRupees(1_500_000)).toBe(15000);
  });

  it("formats rent with Indian digit grouping", () => {
    expect(formatRupees(1_500_000)).toBe("₹15,000");
    expect(formatRupees(12_500_000)).toBe("₹1,25,000");
    expect(formatMonthlyRent(900_000)).toBe("₹9,000 a month");
  });

  it("formats a budget range", () => {
    expect(formatMonthlyBudget(800_000, 1_500_000)).toBe("₹8,000–₹15,000 a month");
    expect(formatMonthlyBudget(800_000, 800_000)).toBe("₹8,000 a month");
    expect(formatMonthlyBudget(800_000, null)).toBe("From ₹8,000 a month");
    expect(formatMonthlyBudget(null, 1_500_000)).toBe("Up to ₹15,000 a month");
    expect(formatMonthlyBudget(null, null)).toBeNull();
  });
});
