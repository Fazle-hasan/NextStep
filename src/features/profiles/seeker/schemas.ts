import { z } from "zod";

import { CV_MAX_BYTES } from "@/lib/supabase/storage";
import { lakhToPaise } from "@/lib/utils/money";
import { Constants } from "@/types/database";

import { seekerStrings } from "./strings";

const { errors } = seekerStrings;

export const EXPERIENCE_LEVELS = Constants.public.Enums.experience_level;
export const WORK_MODES = Constants.public.Enums.work_mode;
export const MAX_SKILLS = 15;
export const MAX_CVS = 5;

// "" (nothing chosen in a select or left blank) becomes null.
const blankToNull = <T extends string>(value: T | "") => (value === "" ? null : (value as T));

const optionalText = (max: number, message: string = errors.tooLong) =>
  z.string().trim().max(max, message).transform(blankToNull);

const optionalHttpsUrl = z
  .string()
  .trim()
  .max(300, errors.url)
  .refine((value) => value === "" || /^https:\/\/[^\s/]+\.[^\s]+$/.test(value), errors.url)
  .transform(blankToNull);

export const basicsSchema = z.object({
  headline: optionalText(120, errors.headline),
  summary: optionalText(2000, errors.summary),
  experienceLevel: z.union([z.enum(EXPERIENCE_LEVELS), z.literal("")]).transform(blankToNull),
  workModePref: z.union([z.enum(WORK_MODES), z.literal("")]).transform(blankToNull),
  preferredCityIds: z.array(z.uuid()).max(10, errors.cities),
  // Comma-separated in the form; stored as text[].
  languages: z
    .string()
    .transform((value) => [
      ...new Set(
        value
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
      ),
    ])
    .refine((list) => list.length <= 10 && list.every((item) => item.length <= 40), errors.languages),
  linkedinUrl: optionalHttpsUrl,
  portfolioUrl: optionalHttpsUrl,
  openToRelocate: z.boolean(),
});
export type BasicsInput = z.input<typeof basicsSchema>;
export type BasicsValues = z.output<typeof basicsSchema>;

export const skillsSchema = z.object({
  skillIds: z.array(z.uuid()).max(MAX_SKILLS, errors.skills),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, errors.date);

export const experienceSchema = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(1, errors.required).max(120, errors.tooLong),
    companyName: z.string().trim().min(1, errors.required).max(120, errors.tooLong),
    startDate: isoDate,
    endDate: z.union([isoDate, z.literal("")]).transform(blankToNull),
    isCurrent: z.boolean(),
    description: optionalText(2000),
  })
  // A current job has no end date.
  .transform((value) => (value.isCurrent ? { ...value, endDate: null } : value))
  .refine((value) => value.endDate === null || value.endDate >= value.startDate, {
    path: ["endDate"],
    message: errors.endBeforeStart,
  });
export type ExperienceInput = z.input<typeof experienceSchema>;
export type ExperienceValues = z.output<typeof experienceSchema>;

const optionalYear = z
  .string()
  .trim()
  .refine((value) => value === "" || (/^\d{4}$/.test(value) && Number(value) >= 1950 && Number(value) <= 2100), errors.year)
  .transform((value) => (value === "" ? null : Number(value)));

export const educationSchema = z
  .object({
    id: z.uuid().optional(),
    institution: z.string().trim().min(1, errors.required).max(160, errors.tooLong),
    degree: z.string().trim().min(1, errors.required).max(120, errors.tooLong),
    field: optionalText(120),
    startYear: optionalYear,
    endYear: optionalYear,
  })
  .refine((value) => value.startYear === null || value.endYear === null || value.endYear >= value.startYear, {
    path: ["endYear"],
    message: errors.endBeforeStart,
  });
export type EducationInput = z.input<typeof educationSchema>;
export type EducationValues = z.output<typeof educationSchema>;

// Entered in lakh per year; stored as paise.
const optionalLakh = z
  .string()
  .trim()
  .refine((value) => value === "" || (/^\d{1,5}(\.\d{1,2})?$/.test(value) && Number(value) <= 10000), errors.salaryNumber)
  .transform((value) => (value === "" ? null : lakhToPaise(Number(value))));

export const salarySchema = z
  .object({
    minLakh: optionalLakh,
    maxLakh: optionalLakh,
    shareWithEmployers: z.boolean(),
  })
  .refine((value) => value.minLakh === null || value.maxLakh === null || value.minLakh <= value.maxLakh, {
    path: ["maxLakh"],
    message: errors.salaryOrder,
  });
export type SalaryInput = z.input<typeof salarySchema>;
export type SalaryValues = z.output<typeof salarySchema>;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

// The file is already in the private bucket at '{user_id}/{uuid}.pdf'.
export const registerCvSchema = z.object({
  storagePath: z.string().regex(new RegExp(`^${UUID}/${UUID}\\.pdf$`)),
  fileName: z
    .string()
    .trim()
    .min(1)
    .transform((name) => name.slice(0, 200)),
  sizeBytes: z.number().int().min(1).max(CV_MAX_BYTES, errors.cvSize),
});

export const idSchema = z.uuid();

// Client-side check before uploading; the bucket enforces the same limits.
export function cvFileError(file: { type: string; size: number; name: string }): string | null {
  if (file.type !== "application/pdf" || !/\.pdf$/i.test(file.name)) return errors.cvType;
  if (file.size > CV_MAX_BYTES) return errors.cvSize;
  if (file.size < 1) return errors.cvUpload;
  return null;
}
