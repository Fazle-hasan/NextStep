import { describe, expect, it } from "vitest";

import {
  cancelSchema,
  exceptionSchema,
  mentorFeedbackSchema,
  mentorProfileSchema,
  noteSchema,
  parseTags,
  respondSchema,
  ruleSchema,
  toExceptionRow,
  toMentorRow,
} from "./schemas";

const ID = "11111111-1111-4111-8111-111111111111";

const profile = {
  headline: "  Senior backend engineer  ",
  bio: "",
  industries: "Software, Fintech ,software, ",
  yearsExperience: "10",
  languages: "English, Urdu",
  cityId: "",
  timezone: "Asia/Kolkata",
  sessionTypes: ["career_guidance" as const, "cv_review" as const],
  defaultDurationMin: "30" as const,
  isAccepting: true,
  skillIds: [ID],
};

describe("parseTags", () => {
  it("splits, trims and removes blanks and duplicates", () => {
    expect(parseTags("Software, Fintech ,software, ")).toEqual(["Software", "Fintech"]);
    expect(parseTags("")).toEqual([]);
  });
});

describe("mentorProfileSchema", () => {
  it("accepts a valid profile and builds the row", () => {
    const row = toMentorRow(mentorProfileSchema.parse(profile));
    expect(row.headline).toBe("Senior backend engineer");
    expect(row.bio).toBeNull();
    expect(row.industries).toEqual(["Software", "Fintech"]);
    expect(row.years_experience).toBe(10);
    expect(row.city_id).toBeNull();
    expect(row.default_duration_min).toBe(30);
  });

  it("needs a headline, a session type and sensible years", () => {
    expect(mentorProfileSchema.safeParse({ ...profile, headline: "ab" }).success).toBe(false);
    expect(mentorProfileSchema.safeParse({ ...profile, sessionTypes: [] }).success).toBe(false);
    expect(mentorProfileSchema.safeParse({ ...profile, yearsExperience: "61" }).success).toBe(false);
    expect(mentorProfileSchema.safeParse({ ...profile, yearsExperience: "ten" }).success).toBe(false);
    expect(mentorProfileSchema.safeParse({ ...profile, defaultDurationMin: "45" }).success).toBe(false);
  });

  it("limits tags to 10", () => {
    const many = Array.from({ length: 11 }, (_, i) => `Tag ${i}`).join(", ");
    expect(mentorProfileSchema.safeParse({ ...profile, industries: many }).success).toBe(false);
  });
});

describe("ruleSchema", () => {
  it("accepts hours where the end is after the start", () => {
    expect(ruleSchema.safeParse({ weekday: 1, startTime: "09:00", endTime: "12:00" }).success).toBe(true);
    expect(ruleSchema.safeParse({ weekday: 0, startTime: "09:00:00", endTime: "09:30:00" }).success).toBe(true);
  });

  it("rejects reversed hours, bad days and bad times", () => {
    expect(ruleSchema.safeParse({ weekday: 1, startTime: "12:00", endTime: "09:00" }).success).toBe(false);
    expect(ruleSchema.safeParse({ weekday: 1, startTime: "09:00", endTime: "09:00" }).success).toBe(false);
    expect(ruleSchema.safeParse({ weekday: 7, startTime: "09:00", endTime: "10:00" }).success).toBe(false);
    expect(ruleSchema.safeParse({ weekday: 1, startTime: "25:00", endTime: "26:00" }).success).toBe(false);
  });
});

describe("exceptionSchema", () => {
  it("lets a whole day be blocked without times", () => {
    const parsed = exceptionSchema.parse({ onDate: "2026-11-01", mode: "unavailable_day", startTime: "", endTime: "" });
    expect(toExceptionRow(parsed)).toEqual({ on_date: "2026-11-01", kind: "unavailable", start_time: null, end_time: null });
  });

  it("needs ordered times for a range or extra hours", () => {
    expect(exceptionSchema.safeParse({ onDate: "2026-11-01", mode: "extra", startTime: "", endTime: "" }).success).toBe(false);
    expect(
      exceptionSchema.safeParse({ onDate: "2026-11-01", mode: "unavailable_range", startTime: "14:00", endTime: "13:00" }).success,
    ).toBe(false);
    const extra = exceptionSchema.parse({ onDate: "2026-11-01", mode: "extra", startTime: "18:00", endTime: "20:00" });
    expect(toExceptionRow(extra)).toEqual({ on_date: "2026-11-01", kind: "extra", start_time: "18:00", end_time: "20:00" });
  });

  it("rejects a malformed date", () => {
    expect(exceptionSchema.safeParse({ onDate: "01/11/2026", mode: "unavailable_day", startTime: "", endTime: "" }).success).toBe(false);
  });
});

describe("respondSchema", () => {
  it("needs an https link to accept", () => {
    expect(respondSchema.safeParse({ sessionId: ID, accept: true, meetingUrl: "", reason: "" }).success).toBe(false);
    expect(respondSchema.safeParse({ sessionId: ID, accept: true, meetingUrl: "http://meet.example.test/x", reason: "" }).success).toBe(false);
    expect(respondSchema.safeParse({ sessionId: ID, accept: true, meetingUrl: "https://meet.example.test/x", reason: "" }).success).toBe(true);
  });

  it("lets a request be declined without a link", () => {
    expect(respondSchema.safeParse({ sessionId: ID, accept: false, meetingUrl: "", reason: "Busy" }).success).toBe(true);
    expect(respondSchema.safeParse({ sessionId: ID, accept: false, meetingUrl: "", reason: "x".repeat(501) }).success).toBe(false);
  });
});

describe("other mentor schemas", () => {
  it("validates cancel, feedback and notes", () => {
    expect(cancelSchema.safeParse({ sessionId: ID, reason: "" }).success).toBe(true);
    expect(mentorFeedbackSchema.safeParse({ sessionId: ID, comment: " ", nextSteps: "" }).success).toBe(false);
    expect(mentorFeedbackSchema.safeParse({ sessionId: ID, comment: "", nextSteps: "Practise system design" }).success).toBe(true);
    expect(noteSchema.safeParse({ sessionId: ID, body: "  " }).success).toBe(false);
    expect(noteSchema.safeParse({ sessionId: ID, body: "Needs confidence" }).success).toBe(true);
  });
});
