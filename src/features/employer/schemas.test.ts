import { describe, expect, it } from "vitest";

import {
  companyCreateSchema,
  companyUpdateSchema,
  jobFormSchema,
  jobStatusSchema,
  locationSchema,
  logoSchema,
  saveJobSchema,
  todayInIndia,
} from "./schemas";

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const CITY_ID = "22222222-2222-4222-8222-222222222222";
const SKILL_ID = "33333333-3333-4333-8333-333333333333";
const FILE_ID = "44444444-4444-4444-8444-444444444444";

const company = {
  name: "  Acme Test Ltd ",
  industry: "",
  size: "",
  website: "",
  description: "",
  isCommunityOwned: false,
  leapFriendly: true,
  verificationNote: "",
};

const job = {
  title: "Backend Engineer",
  description: "Build APIs",
  requirements: "",
  jobType: "full_time",
  workMode: "hybrid",
  experienceLevel: "mid",
  cityId: CITY_ID,
  neighbourhoodId: "",
  addressText: "",
  openings: 2,
  applicationDeadline: "",
  skillIds: [SKILL_ID],
  salaryMinLakh: "8",
  salaryMaxLakh: "12.5",
  salaryVisible: true,
  questions: [{ question: "Years of experience?", isRequired: true }],
};

describe("companyCreateSchema", () => {
  it("trims the name and turns empty optional fields into undefined", () => {
    const result = companyCreateSchema.parse(company);
    expect(result.name).toBe("Acme Test Ltd");
    expect(result.industry).toBeUndefined();
    expect(result.size).toBeUndefined();
    expect(result.website).toBeUndefined();
    expect(result.verificationNote).toBeUndefined();
  });

  it("requires a name of at least 2 characters", () => {
    expect(companyCreateSchema.safeParse({ ...company, name: " A " }).success).toBe(false);
  });

  it("accepts a known size and rejects an unknown one", () => {
    expect(companyCreateSchema.parse({ ...company, size: "s11_50" }).size).toBe("s11_50");
    expect(companyCreateSchema.safeParse({ ...company, size: "huge" }).success).toBe(false);
  });

  it("only accepts http(s) websites", () => {
    expect(companyCreateSchema.parse({ ...company, website: "https://acme.example.test" }).website).toBe(
      "https://acme.example.test",
    );
    expect(companyCreateSchema.safeParse({ ...company, website: "acme.example.test" }).success).toBe(false);
    expect(companyCreateSchema.safeParse({ ...company, website: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("companyUpdateSchema", () => {
  it("needs a company id", () => {
    expect(companyUpdateSchema.safeParse(company).success).toBe(false);
    expect(companyUpdateSchema.safeParse({ ...company, companyId: COMPANY_ID }).success).toBe(true);
  });
});

describe("locationSchema and logoSchema", () => {
  it("requires a city", () => {
    expect(locationSchema.safeParse({ companyId: COMPANY_ID, cityId: "", address: "" }).success).toBe(false);
    expect(locationSchema.parse({ companyId: COMPANY_ID, cityId: CITY_ID, address: " 1 Sample Road " }).address).toBe(
      "1 Sample Road",
    );
  });

  it("only accepts a logo path inside the company's own folder", () => {
    expect(logoSchema.safeParse({ companyId: COMPANY_ID, path: `${COMPANY_ID}/${FILE_ID}.png` }).success).toBe(true);
    expect(logoSchema.safeParse({ companyId: COMPANY_ID, path: `${CITY_ID}/${FILE_ID}.png` }).success).toBe(false);
    expect(logoSchema.safeParse({ companyId: COMPANY_ID, path: `${COMPANY_ID}/../x.png` }).success).toBe(false);
    expect(logoSchema.safeParse({ companyId: COMPANY_ID, path: `${COMPANY_ID}/${FILE_ID}.svg` }).success).toBe(false);
  });
});

describe("jobFormSchema", () => {
  it("parses a valid job and converts salaries to numbers", () => {
    const result = jobFormSchema.parse(job);
    expect(result.salaryMinLakh).toBe(8);
    expect(result.salaryMaxLakh).toBe(12.5);
    expect(result.neighbourhoodId).toBeUndefined();
    expect(result.applicationDeadline).toBeUndefined();
  });

  it("requires a city unless the job is remote", () => {
    expect(jobFormSchema.safeParse({ ...job, cityId: "" }).success).toBe(false);
    expect(jobFormSchema.safeParse({ ...job, cityId: "", workMode: "remote" }).success).toBe(true);
  });

  it("rejects a maximum salary below the minimum and non-numeric salaries", () => {
    expect(jobFormSchema.safeParse({ ...job, salaryMinLakh: "12", salaryMaxLakh: "8" }).success).toBe(false);
    expect(jobFormSchema.safeParse({ ...job, salaryMinLakh: "eight" }).success).toBe(false);
    expect(jobFormSchema.safeParse({ ...job, salaryMinLakh: "", salaryMaxLakh: "" }).success).toBe(true);
  });

  it("rejects a deadline in the past and accepts today", () => {
    expect(jobFormSchema.safeParse({ ...job, applicationDeadline: "2020-01-01" }).success).toBe(false);
    expect(jobFormSchema.safeParse({ ...job, applicationDeadline: todayInIndia() }).success).toBe(true);
  });

  it("limits openings, skills and questions", () => {
    expect(jobFormSchema.safeParse({ ...job, openings: 0 }).success).toBe(false);
    expect(jobFormSchema.safeParse({ ...job, openings: 1.5 }).success).toBe(false);
    expect(jobFormSchema.safeParse({ ...job, skillIds: Array(11).fill(SKILL_ID) }).success).toBe(false);
    expect(jobFormSchema.safeParse({ ...job, questions: Array(11).fill(job.questions[0]) }).success).toBe(false);
    expect(jobFormSchema.safeParse({ ...job, questions: [{ question: "a", isRequired: false }] }).success).toBe(false);
  });

  it("requires type, mode and level", () => {
    expect(jobFormSchema.safeParse({ ...job, jobType: "" }).success).toBe(false);
    expect(jobFormSchema.safeParse({ ...job, workMode: "anywhere" }).success).toBe(false);
  });
});

describe("saveJobSchema and jobStatusSchema", () => {
  it("wraps the job values with a company and publish flag", () => {
    expect(saveJobSchema.safeParse({ companyId: COMPANY_ID, publish: false, values: job }).success).toBe(true);
    expect(saveJobSchema.safeParse({ companyId: "nope", publish: false, values: job }).success).toBe(false);
  });

  it("only lets employers ask for published, draft or closed", () => {
    expect(jobStatusSchema.safeParse({ jobId: COMPANY_ID, status: "closed" }).success).toBe(true);
    expect(jobStatusSchema.safeParse({ jobId: COMPANY_ID, status: "expired" }).success).toBe(false);
    expect(jobStatusSchema.safeParse({ jobId: COMPANY_ID, status: "pending_review" }).success).toBe(false);
  });
});

describe("todayInIndia", () => {
  it("uses the India date, which is ahead of UTC late in the evening", () => {
    expect(todayInIndia(new Date("2026-10-04T20:00:00Z"))).toBe("2026-10-05");
    expect(todayInIndia(new Date("2026-10-04T10:00:00Z"))).toBe("2026-10-04");
  });
});
