import { z } from "zod";

import { Constants } from "@/types/database";

import { bookingStrings } from "./strings";
import type { MentorFilters } from "./types";

const { errors } = bookingStrings;

export const SESSION_TYPES = Constants.public.Enums.session_type;
export const RATINGS = ["1", "2", "3", "4", "5"] as const;
// Slots are bookable up to 30 days ahead; the picker pages through them 14 days at a time.
export const SLOT_WINDOW_DAYS = 14;
export const SLOT_MAX_PAGE = 2;
export const MAX_UPCOMING_SESSIONS = 2;

// Empty or whitespace-only text becomes null.
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value === "" ? null : value));

const timestamp = z.string().refine((value) => value.length <= 40 && !Number.isNaN(Date.parse(value)), errors.slot);

export const bookSessionSchema = z.object({
  mentorId: z.uuid(errors.invalid),
  sessionType: z.enum(SESSION_TYPES, errors.type),
  startsAt: timestamp,
  goalNote: optionalText(1000, errors.note),
});

export const cancelSessionSchema = z.object({
  sessionId: z.uuid(errors.invalid),
  reason: optionalText(500, errors.reason),
});

export const feedbackSchema = z.object({
  sessionId: z.uuid(errors.invalid),
  rating: z.enum(RATINGS, errors.rating).transform(Number),
  comment: optionalText(1000, errors.comment),
});

export const slotsSchema = z.object({
  mentorId: z.uuid(errors.invalid),
  page: z.number().int().min(0).max(SLOT_MAX_PAGE),
});

export type BookSessionInput = z.input<typeof bookSessionSchema>;
export type BookSessionValues = z.output<typeof bookSessionSchema>;
export type CancelSessionInput = z.input<typeof cancelSessionSchema>;
export type CancelSessionValues = z.output<typeof cancelSessionSchema>;
export type FeedbackInput = z.input<typeof feedbackSchema>;
export type FeedbackValues = z.output<typeof feedbackSchema>;

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Search params -> filters. Anything malformed is ignored rather than rejected.
export function parseMentorFilters(params: RawParams): MentorFilters {
  const city = z.uuid().safeParse(first(params.city));
  const type = z.enum(SESSION_TYPES).safeParse(first(params.type));
  const skill = z.uuid().safeParse(first(params.skill));
  return {
    ...(city.success ? { cityId: city.data } : {}),
    ...(type.success ? { sessionType: type.data } : {}),
    ...(skill.success ? { skillId: skill.data } : {}),
  };
}
