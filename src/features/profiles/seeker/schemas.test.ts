import { describe, expect, it, vi } from "vitest";

// storage.ts reads public env vars at import time; the schemas only need the size limit.
vi.mock("@/lib/supabase/storage", () => ({ CV_MAX_BYTES: 5 * 1024 * 1024 }));

import {
  basicsSchema,
  cvFileError,
  educationSchema,
  experienceSchema,
  registerCvSchema,
  salarySchema,
  skillsSchema,
} from "./schemas";

const USER = "11111111-1111-4111-8111-111111111111";
const FILE = "22222222-2222-4222-8222-222222222222";

const basics = {
  headline: "  Accountant  ",
  summary: "",
  experienceLevel: "",
  workModePref: "remote",
  preferredCityIds: [USER],
  languages: "Urdu, Hindi , ,English, Urdu",
  linkedinUrl: "",
  portfolioUrl: "https://example.test/me",
  openToRelocate: true,
} as const;

describe("basicsSchema", () => {
  it("trims text, turns blanks into null and splits languages", () => {
    const result = basicsSchema.parse(basics);
    expect(result.headline).toBe("Accountant");
    expect(result.summary).toBeNull();
    expect(result.experienceLevel).toBeNull();
    expect(result.workModePref).toBe("remote");
    expect(result.languages).toEqual(["Urdu", "Hindi", "English"]);
    expect(result.linkedinUrl).toBeNull();
    expect(result.portfolioUrl).toBe("https://example.test/me");
  });

  it("rejects links that are not https", () => {
    expect(basicsSchema.safeParse({ ...basics, linkedinUrl: "http://example.test" }).success).toBe(false);
    expect(basicsSchema.safeParse({ ...basics, portfolioUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("rejects unknown enum values, too many languages and bad city ids", () => {
    expect(basicsSchema.safeParse({ ...basics, experienceLevel: "wizard" }).success).toBe(false);
    expect(basicsSchema.safeParse({ ...basics, languages: Array.from({ length: 11 }, (_, i) => `L${i}`).join(",") }).success).toBe(false);
    expect(basicsSchema.safeParse({ ...basics, preferredCityIds: ["nope"] }).success).toBe(false);
    expect(basicsSchema.safeParse({ ...basics, headline: "x".repeat(121) }).success).toBe(false);
  });
});

describe("skillsSchema", () => {
  it("allows up to 15 skill ids", () => {
    expect(skillsSchema.safeParse({ skillIds: Array(15).fill(USER) }).success).toBe(true);
    expect(skillsSchema.safeParse({ skillIds: Array(16).fill(USER) }).success).toBe(false);
    expect(skillsSchema.safeParse({ skillIds: ["x"] }).success).toBe(false);
  });
});

describe("experienceSchema", () => {
  const base = { title: "Dev", companyName: "Acme", startDate: "2022-01-01", endDate: "2023-01-01", isCurrent: false, description: "" };

  it("accepts a finished job", () => {
    const result = experienceSchema.parse(base);
    expect(result.endDate).toBe("2023-01-01");
    expect(result.description).toBeNull();
  });

  it("clears the end date for a current job", () => {
    expect(experienceSchema.parse({ ...base, isCurrent: true }).endDate).toBeNull();
  });

  it("rejects an end before the start and missing fields", () => {
    expect(experienceSchema.safeParse({ ...base, endDate: "2021-12-31" }).success).toBe(false);
    expect(experienceSchema.safeParse({ ...base, title: " " }).success).toBe(false);
    expect(experienceSchema.safeParse({ ...base, startDate: "" }).success).toBe(false);
  });
});

describe("educationSchema", () => {
  const base = { institution: "Sample University", degree: "B.Com", field: "", startYear: "2019", endYear: "2022" };

  it("converts years to numbers and blanks to null", () => {
    const result = educationSchema.parse({ ...base, startYear: "" });
    expect(result.startYear).toBeNull();
    expect(result.endYear).toBe(2022);
    expect(result.field).toBeNull();
  });

  it("rejects bad years", () => {
    expect(educationSchema.safeParse({ ...base, endYear: "2018" }).success).toBe(false);
    expect(educationSchema.safeParse({ ...base, endYear: "22" }).success).toBe(false);
    expect(educationSchema.safeParse({ ...base, startYear: "1900" }).success).toBe(false);
  });
});

describe("salarySchema", () => {
  it("converts lakh a year to paise", () => {
    const result = salarySchema.parse({ minLakh: "6", maxLakh: "7.5", shareWithEmployers: false });
    expect(result.minLakh).toBe(60_000_000);
    expect(result.maxLakh).toBe(75_000_000);
  });

  it("allows blanks and rejects a minimum above the maximum or non-numbers", () => {
    expect(salarySchema.parse({ minLakh: "", maxLakh: "", shareWithEmployers: true }).minLakh).toBeNull();
    expect(salarySchema.safeParse({ minLakh: "9", maxLakh: "8", shareWithEmployers: false }).success).toBe(false);
    expect(salarySchema.safeParse({ minLakh: "six", maxLakh: "", shareWithEmployers: false }).success).toBe(false);
    expect(salarySchema.safeParse({ minLakh: "-1", maxLakh: "", shareWithEmployers: false }).success).toBe(false);
  });
});

describe("registerCvSchema", () => {
  const base = { storagePath: `${USER}/${FILE}.pdf`, fileName: "cv.pdf", sizeBytes: 1000 };

  it("accepts a user-folder PDF path", () => {
    expect(registerCvSchema.safeParse(base).success).toBe(true);
  });

  it("rejects other paths, oversized files and empty names", () => {
    expect(registerCvSchema.safeParse({ ...base, storagePath: `${USER}/../x.pdf` }).success).toBe(false);
    expect(registerCvSchema.safeParse({ ...base, storagePath: `${USER}/${FILE}.exe` }).success).toBe(false);
    expect(registerCvSchema.safeParse({ ...base, sizeBytes: 5 * 1024 * 1024 + 1 }).success).toBe(false);
    expect(registerCvSchema.safeParse({ ...base, fileName: " " }).success).toBe(false);
  });

  it("shortens very long file names", () => {
    expect(registerCvSchema.parse({ ...base, fileName: "a".repeat(300) }).fileName).toHaveLength(200);
  });
});

describe("cvFileError", () => {
  it("accepts a small PDF and rejects other files", () => {
    expect(cvFileError({ type: "application/pdf", size: 1000, name: "cv.pdf" })).toBeNull();
    expect(cvFileError({ type: "image/png", size: 1000, name: "cv.png" })).not.toBeNull();
    expect(cvFileError({ type: "application/pdf", size: 6 * 1024 * 1024, name: "cv.pdf" })).not.toBeNull();
  });
});
