import { z } from "zod";

import { Constants } from "@/types/database";

import { employerStrings } from "./strings";

const { errors } = employerStrings;

export const COMPANY_SIZES = Constants.public.Enums.company_size;
export const JOB_TYPES = Constants.public.Enums.job_type;
export const WORK_MODES = Constants.public.Enums.work_mode;
export const EXPERIENCE_LEVELS = Constants.public.Enums.experience_level;

export const MAX_JOB_SKILLS = 10;
export const MAX_QUESTIONS = 10;
export const MAX_LOCATIONS = 10;
const MAX_SALARY_LAKH = 10_000;

// "" (nothing typed / nothing chosen) becomes undefined.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, errors.tooLong(max))
    .transform((v) => (v === "" ? undefined : v));

const optionalUuid = z.union([z.uuid(), z.literal("")]).transform((v) => (v === "" ? undefined : v));

const website = z
  .string()
  .trim()
  .max(300, errors.tooLong(300))
  .refine((v) => v === "" || /^https?:\/\/[^\s.]+\.[^\s]+$/i.test(v), errors.website)
  .transform((v) => (v === "" ? undefined : v));

const companyFields = {
  name: z.string().trim().min(2, errors.name).max(120, errors.name),
  industry: optionalText(80),
  size: z.union([z.enum(COMPANY_SIZES), z.literal("")]).transform((v) => (v === "" ? undefined : v)),
  website,
  description: optionalText(4000),
  isCommunityOwned: z.boolean(),
  leapFriendly: z.boolean(),
};

export const companyCreateSchema = z.object({ ...companyFields, verificationNote: optionalText(1000) });
export const companyUpdateSchema = z.object({ companyId: z.uuid(), ...companyFields });

export type CompanyFormInput = z.input<typeof companyCreateSchema>;
export type CompanyFormValues = z.output<typeof companyCreateSchema>;

export const verificationRequestSchema = z.object({ companyId: z.uuid(), note: optionalText(1000) });
export const affiliationSchema = z.object({ affiliationId: z.uuid(), confirm: z.boolean() });

export const locationSchema = z.object({
  companyId: z.uuid(),
  cityId: z.uuid({ error: errors.choose }),
  address: optionalText(300),
});
export const locationRemoveSchema = z.object({ companyId: z.uuid(), locationId: z.uuid() });

// Logo files are stored at '{companyId}/{uuid}.{ext}' in the company-logos bucket.
export const logoSchema = z
  .object({
    companyId: z.uuid(),
    path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/),
  })
  .refine((v) => v.path.startsWith(`${v.companyId}/`));

// Today's date in India (launch market, D-006) as YYYY-MM-DD.
export function todayInIndia(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

// Salary typed in lakh per year: "" or a number like 8 or 8.5.
const salaryLakh = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= MAX_SALARY_LAKH), errors.salaryNumber)
  .transform((v) => (v === "" ? undefined : Number(v)));

export const jobFormSchema = z
  .object({
    title: z.string().trim().min(3, errors.jobTitle).max(140, errors.jobTitle),
    description: z.string().trim().min(1, errors.jobDescription).max(8000, errors.jobDescription),
    requirements: optionalText(4000),
    jobType: z.enum(JOB_TYPES, { error: errors.choose }),
    workMode: z.enum(WORK_MODES, { error: errors.choose }),
    experienceLevel: z.enum(EXPERIENCE_LEVELS, { error: errors.choose }),
    cityId: optionalUuid,
    neighbourhoodId: optionalUuid,
    addressText: optionalText(300),
    openings: z.number({ error: errors.openings }).int(errors.openings).min(1, errors.openings).max(1000, errors.openings),
    applicationDeadline: z
      .string()
      .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), errors.deadlinePast)
      .refine((v) => v === "" || v >= todayInIndia(), errors.deadlinePast)
      .transform((v) => (v === "" ? undefined : v)),
    skillIds: z.array(z.uuid()).max(MAX_JOB_SKILLS, errors.tooManySkills),
    salaryMinLakh: salaryLakh,
    salaryMaxLakh: salaryLakh,
    salaryVisible: z.boolean(),
    questions: z
      .array(
        z.object({
          question: z.string().trim().min(3, errors.question).max(300, errors.question),
          isRequired: z.boolean(),
        }),
      )
      .max(MAX_QUESTIONS, errors.tooManyQuestions),
  })
  .superRefine((v, ctx) => {
    if (v.workMode !== "remote" && !v.cityId) {
      ctx.addIssue({ code: "custom", path: ["cityId"], message: errors.cityRequired });
    }
    if (v.salaryMinLakh != null && v.salaryMaxLakh != null && v.salaryMinLakh > v.salaryMaxLakh) {
      ctx.addIssue({ code: "custom", path: ["salaryMaxLakh"], message: errors.salaryOrder });
    }
  });

export type JobFormInput = z.input<typeof jobFormSchema>;
export type JobFormValues = z.output<typeof jobFormSchema>;

export const saveJobSchema = z.object({
  jobId: z.uuid().optional(),
  companyId: z.uuid(),
  publish: z.boolean(),
  values: jobFormSchema,
});

export const jobStatusSchema = z.object({
  jobId: z.uuid(),
  status: z.enum(["published", "draft", "closed"]),
});

export const jobIdSchema = z.object({ jobId: z.uuid() });
