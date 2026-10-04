import { describe, expect, it } from "vitest";

import { connectSchema, flatmateProfileSchema, parseMatchesPage, respondSchema } from "./schemas";

const CITY = "11111111-1111-4111-8111-111111111111";
const AREA = "22222222-2222-4222-8222-222222222222";

const profile = {
  cityId: CITY,
  neighbourhoodIds: [AREA],
  budgetMin: "8000",
  budgetMax: " 15000 ",
  moveDate: "2026-11-01",
  preferredGender: "any",
  foodHabit: "halal_only",
  smokes: false,
  okWithSmoker: false,
  sleepSchedule: "flexible",
  workSchedule: "day_shift",
  cleanliness: "4",
  guestsPolicy: "occasionally",
  bio: "  Quiet and tidy.  ",
  isActive: true,
};

describe("flatmateProfileSchema", () => {
  it("converts rupees to paise, trims text and parses cleanliness", () => {
    const parsed = flatmateProfileSchema.parse(profile);
    expect(parsed.budgetMin).toBe(800_000);
    expect(parsed.budgetMax).toBe(1_500_000);
    expect(parsed.cleanliness).toBe(4);
    expect(parsed.bio).toBe("Quiet and tidy.");
  });

  it("turns an empty bio into null", () => {
    expect(flatmateProfileSchema.parse({ ...profile, bio: "   " }).bio).toBeNull();
  });

  it("rejects an upper budget below the lower budget", () => {
    const result = flatmateProfileSchema.safeParse({ ...profile, budgetMin: "20000", budgetMax: "10000" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(["budgetMax"]);
  });

  it.each(["", "abc", "12.5", "-5", "999999999"])("rejects the budget %j", (value) => {
    expect(flatmateProfileSchema.safeParse({ ...profile, budgetMin: value }).success).toBe(false);
  });

  it.each(["", "01-11-2026", "2026-13-40", "soon"])("rejects the move date %j", (value) => {
    expect(flatmateProfileSchema.safeParse({ ...profile, moveDate: value }).success).toBe(false);
  });

  it("rejects a missing city, unknown options and out-of-range cleanliness", () => {
    expect(flatmateProfileSchema.safeParse({ ...profile, cityId: "" }).success).toBe(false);
    expect(flatmateProfileSchema.safeParse({ ...profile, preferredGender: "family" }).success).toBe(false);
    expect(flatmateProfileSchema.safeParse({ ...profile, foodHabit: "" }).success).toBe(false);
    expect(flatmateProfileSchema.safeParse({ ...profile, cleanliness: "6" }).success).toBe(false);
  });

  it("allows at most 20 areas", () => {
    const many = Array.from({ length: 21 }, () => AREA);
    expect(flatmateProfileSchema.safeParse({ ...profile, neighbourhoodIds: many }).success).toBe(false);
    expect(flatmateProfileSchema.safeParse({ ...profile, neighbourhoodIds: [] }).success).toBe(true);
  });
});

describe("connectSchema", () => {
  it("trims the note and turns an empty one into null", () => {
    expect(connectSchema.parse({ recipientId: CITY, message: "  Hello  " }).message).toBe("Hello");
    expect(connectSchema.parse({ recipientId: CITY, message: "" }).message).toBeNull();
  });

  it("rejects a long note or a bad id", () => {
    expect(connectSchema.safeParse({ recipientId: CITY, message: "x".repeat(501) }).success).toBe(false);
    expect(connectSchema.safeParse({ recipientId: "nope", message: "" }).success).toBe(false);
  });
});

describe("respondSchema", () => {
  it("needs a connection id and a decision", () => {
    expect(respondSchema.safeParse({ connectionId: CITY, accept: true }).success).toBe(true);
    expect(respondSchema.safeParse({ connectionId: CITY }).success).toBe(false);
  });
});

describe("parseMatchesPage", () => {
  it("reads a positive whole page number and falls back to 1", () => {
    expect(parseMatchesPage("3")).toBe(3);
    expect(parseMatchesPage(["2", "9"])).toBe(2);
    expect(parseMatchesPage(undefined)).toBe(1);
    expect(parseMatchesPage("0")).toBe(1);
    expect(parseMatchesPage("1.5")).toBe(1);
    expect(parseMatchesPage("abc")).toBe(1);
  });
});
