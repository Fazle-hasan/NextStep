import { z } from "zod";

import { Constants } from "@/types/database";

import { mentorStrings } from "./strings";

const e = mentorStrings.errors;

export const SESSION_TYPES = Constants.public.Enums.session_type;
export const DURATIONS = ["30", "60"] as const;
export const EXCEPTION_MODES = ["unavailable_day", "unavailable_range", "extra"] as const;
export type ExceptionMode = (typeof EXCEPTION_MODES)[number];

const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 60;

// "Software, Fintech ,software" -> ["Software", "Fintech"] (blank entries and duplicates dropped).
export function parseTags(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => {
      const key = part.toLowerCase();
      if (!part || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

const tagList = z
  .string()
  .max(700, e.tags)
  .refine((value) => {
    const tags = parseTags(value);
    return tags.length <= MAX_TAGS && tags.every((tag) => tag.length <= MAX_TAG_LENGTH);
  }, e.tags);

// The form's raw values. The same schema runs in the browser and in the server action.
export const mentorProfileSchema = z.object({
  headline: z.string().trim().min(3, e.headline).max(120, e.headline),
  bio: z.string().trim().max(2000, e.bio),
  industries: tagList,
  yearsExperience: z
    .string()
    .trim()
    .regex(/^\d{1,2}$/, e.years)
    .refine((value) => Number(value) <= 60, e.years),
  languages: tagList,
  cityId: z.union([z.uuid(), z.literal("")]),
  timezone: z.string().min(1, e.timezone).max(64, e.timezone),
  sessionTypes: z.array(z.enum(SESSION_TYPES)).min(1, e.sessionTypes).max(SESSION_TYPES.length),
  defaultDurationMin: z.enum(DURATIONS),
  isAccepting: z.boolean(),
  skillIds: z.array(z.uuid()).max(15, e.skills),
});

export type MentorProfileValues = z.infer<typeof mentorProfileSchema>;

export function toMentorRow(v: MentorProfileValues) {
  return {
    headline: v.headline,
    bio: v.bio || null,
    industries: parseTags(v.industries),
    years_experience: Number(v.yearsExperience),
    languages: parseTags(v.languages),
    city_id: v.cityId || null,
    timezone: v.timezone,
    session_types: v.sessionTypes,
    default_duration_min: Number(v.defaultDurationMin),
    is_accepting: v.isAccepting,
  };
}

// "09:00" or "09:00:00" (as <input type="time"> and Postgres give it).
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, e.time);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, e.date);

export const ruleSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    startTime: time,
    endTime: time,
  })
  .refine((v) => v.endTime.slice(0, 5) > v.startTime.slice(0, 5), { message: e.timeOrder, path: ["endTime"] });

export type RuleValues = z.infer<typeof ruleSchema>;

export const exceptionSchema = z
  .object({
    onDate: date,
    mode: z.enum(EXCEPTION_MODES),
    startTime: z.union([time, z.literal("")]),
    endTime: z.union([time, z.literal("")]),
  })
  .superRefine((v, ctx) => {
    if (v.mode === "unavailable_day") return;
    if (!v.startTime || !v.endTime) {
      ctx.addIssue({ code: "custom", message: e.timesRequired, path: ["startTime"] });
      return;
    }
    if (v.endTime.slice(0, 5) <= v.startTime.slice(0, 5)) {
      ctx.addIssue({ code: "custom", message: e.timeOrder, path: ["endTime"] });
    }
  });

export type ExceptionValues = z.infer<typeof exceptionSchema>;

export function toExceptionRow(v: ExceptionValues) {
  const wholeDay = v.mode === "unavailable_day";
  return {
    on_date: v.onDate,
    kind: v.mode === "extra" ? ("extra" as const) : ("unavailable" as const),
    start_time: wholeDay ? null : v.startTime,
    end_time: wholeDay ? null : v.endTime,
  };
}

export const idSchema = z.object({ id: z.uuid() });

export const respondSchema = z
  .object({
    sessionId: z.uuid(),
    accept: z.boolean(),
    meetingUrl: z.string().trim().max(500, e.meetingUrl),
    reason: z.string().trim().max(500, e.reason),
  })
  .refine((v) => !v.accept || /^https:\/\/\S+$/.test(v.meetingUrl), { message: e.meetingUrl, path: ["meetingUrl"] });

export const cancelSchema = z.object({
  sessionId: z.uuid(),
  reason: z.string().trim().max(500, e.reason),
});

export const mentorFeedbackSchema = z
  .object({
    sessionId: z.uuid(),
    comment: z.string().trim().max(1000, e.comment),
    nextSteps: z.string().trim().max(2000, e.nextSteps),
  })
  .refine((v) => v.comment.length > 0 || v.nextSteps.length > 0, { message: e.feedbackEmpty, path: ["comment"] });

export const noteSchema = z.object({
  sessionId: z.uuid(),
  body: z.string().trim().min(1, e.note).max(2000, e.note),
});

export const noteUpdateSchema = z.object({
  noteId: z.uuid(),
  body: z.string().trim().min(1, e.note).max(2000, e.note),
});

export const reverifySchema = z.object({ note: z.string().trim().max(1000, e.reverifyNote) });
