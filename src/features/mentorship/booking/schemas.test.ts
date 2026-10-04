import { describe, expect, it } from "vitest";

import { bookSessionSchema, cancelSessionSchema, feedbackSchema, parseMentorFilters, slotsSchema } from "./schemas";

const ID = "3f2c1a9e-8b7d-4c6a-9e5f-1a2b3c4d5e6f";

describe("bookSessionSchema", () => {
  const valid = { mentorId: ID, sessionType: "cv_review", startsAt: "2026-10-06T04:00:00+00:00", goalNote: "  Review my CV  " };

  it("accepts a valid request and trims the note", () => {
    const result = bookSessionSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.goalNote).toBe("Review my CV");
  });

  it("turns an empty note into null", () => {
    const result = bookSessionSchema.safeParse({ ...valid, goalNote: "   " });
    expect(result.success && result.data.goalNote).toBe(null);
  });

  it("rejects a missing or unknown session type", () => {
    expect(bookSessionSchema.safeParse({ ...valid, sessionType: undefined }).success).toBe(false);
    expect(bookSessionSchema.safeParse({ ...valid, sessionType: "palm_reading" }).success).toBe(false);
  });

  it("rejects a missing or malformed time", () => {
    expect(bookSessionSchema.safeParse({ ...valid, startsAt: "" }).success).toBe(false);
    expect(bookSessionSchema.safeParse({ ...valid, startsAt: "tomorrow-ish" }).success).toBe(false);
  });

  it("rejects a bad mentor id and a note over 1000 characters", () => {
    expect(bookSessionSchema.safeParse({ ...valid, mentorId: "abc" }).success).toBe(false);
    expect(bookSessionSchema.safeParse({ ...valid, goalNote: "x".repeat(1001) }).success).toBe(false);
  });
});

describe("cancelSessionSchema", () => {
  it("accepts an optional reason", () => {
    const result = cancelSessionSchema.safeParse({ sessionId: ID, reason: "" });
    expect(result.success && result.data.reason).toBe(null);
    expect(cancelSessionSchema.safeParse({ sessionId: ID, reason: "Change of plans" }).success).toBe(true);
  });

  it("rejects a reason over 500 characters", () => {
    expect(cancelSessionSchema.safeParse({ sessionId: ID, reason: "x".repeat(501) }).success).toBe(false);
  });
});

describe("feedbackSchema", () => {
  it("turns the chosen rating into a number", () => {
    const result = feedbackSchema.safeParse({ sessionId: ID, rating: "4", comment: " Helpful " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ sessionId: ID, rating: 4, comment: "Helpful" });
  });

  it("requires a rating from 1 to 5", () => {
    expect(feedbackSchema.safeParse({ sessionId: ID, comment: "" }).success).toBe(false);
    expect(feedbackSchema.safeParse({ sessionId: ID, rating: "0", comment: "" }).success).toBe(false);
    expect(feedbackSchema.safeParse({ sessionId: ID, rating: "6", comment: "" }).success).toBe(false);
  });

  it("rejects a comment over 1000 characters", () => {
    expect(feedbackSchema.safeParse({ sessionId: ID, rating: "5", comment: "x".repeat(1001) }).success).toBe(false);
  });
});

describe("slotsSchema", () => {
  it("accepts pages 0 to 2 only", () => {
    expect(slotsSchema.safeParse({ mentorId: ID, page: 0 }).success).toBe(true);
    expect(slotsSchema.safeParse({ mentorId: ID, page: 2 }).success).toBe(true);
    expect(slotsSchema.safeParse({ mentorId: ID, page: 3 }).success).toBe(false);
    expect(slotsSchema.safeParse({ mentorId: ID, page: -1 }).success).toBe(false);
  });
});

describe("parseMentorFilters", () => {
  it("reads valid filters", () => {
    expect(parseMentorFilters({ city: ID, type: "mock_interview", skill: ID })).toEqual({
      cityId: ID,
      sessionType: "mock_interview",
      skillId: ID,
    });
  });

  it("ignores empty and malformed values", () => {
    expect(parseMentorFilters({ city: "", type: "nonsense", skill: "123" })).toEqual({});
    expect(parseMentorFilters({})).toEqual({});
  });

  it("uses the first value when a parameter repeats", () => {
    expect(parseMentorFilters({ type: ["cv_review", "mock_interview"] })).toEqual({ sessionType: "cv_review" });
  });
});
