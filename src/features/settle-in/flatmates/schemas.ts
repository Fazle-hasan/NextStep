import { z } from "zod";

import { rupeesToPaise } from "@/lib/utils/money";
import { Constants } from "@/types/database";

import { flatmateStrings } from "./strings";

const { errors } = flatmateStrings;

export const PREFERRED_GENDERS = Constants.public.Enums.flatmate_gender_pref;
export const FOOD_HABITS = Constants.public.Enums.food_habit;
export const SLEEP_SCHEDULES = Constants.public.Enums.sleep_schedule;
export const WORK_SCHEDULES = Constants.public.Enums.work_schedule;
export const GUESTS_POLICIES = Constants.public.Enums.guests_policy;
export const CLEANLINESS_LEVELS = ["1", "2", "3", "4", "5"] as const;
export const MAX_AREAS = 20;
export const MATCHES_PAGE_SIZE = 20;
// Budgets are stored as integer paise, so keep rupee amounts well inside the integer range.
const MAX_RUPEES = 10_000_000;

// Whole rupees typed into a text field -> paise.
const rupeeAmount = z
  .string()
  .trim()
  .refine((value) => /^\d{1,8}$/.test(value) && Number(value) <= MAX_RUPEES, errors.budget)
  .transform((value) => rupeesToPaise(Number(value)));

const isoDate = z
  .string()
  .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), errors.moveDate);

export const flatmateProfileSchema = z
  .object({
    cityId: z.uuid(errors.city),
    neighbourhoodIds: z.array(z.uuid()).max(MAX_AREAS, errors.areas),
    budgetMin: rupeeAmount,
    budgetMax: rupeeAmount,
    moveDate: isoDate,
    preferredGender: z.enum(PREFERRED_GENDERS, errors.choose),
    foodHabit: z.enum(FOOD_HABITS, errors.choose),
    smokes: z.boolean(),
    okWithSmoker: z.boolean(),
    sleepSchedule: z.enum(SLEEP_SCHEDULES, errors.choose),
    workSchedule: z.enum(WORK_SCHEDULES, errors.choose),
    cleanliness: z.enum(CLEANLINESS_LEVELS, errors.cleanliness).transform(Number),
    guestsPolicy: z.enum(GUESTS_POLICIES, errors.choose),
    bio: z
      .string()
      .trim()
      .max(1000, errors.bio)
      .transform((value) => (value === "" ? null : value)),
    isActive: z.boolean(),
  })
  .refine((value) => value.budgetMax >= value.budgetMin, { path: ["budgetMax"], message: errors.budgetOrder });

export type FlatmateProfileInput = z.input<typeof flatmateProfileSchema>;
export type FlatmateProfileValues = z.output<typeof flatmateProfileSchema>;

export const activeSchema = z.object({ isActive: z.boolean() });

export const connectSchema = z.object({
  recipientId: z.uuid(),
  message: z
    .string()
    .trim()
    .max(500, errors.message)
    .transform((value) => (value === "" ? null : value)),
});

export type ConnectInput = z.input<typeof connectSchema>;
export type ConnectValues = z.output<typeof connectSchema>;

export const respondSchema = z.object({ connectionId: z.uuid(), accept: z.boolean() });
export const connectionIdSchema = z.object({ connectionId: z.uuid() });

// ?page=N on the match list. Anything odd falls back to page 1.
export function parseMatchesPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 && page <= 500 ? page : 1;
}
