import { describe, expect, it } from "vitest";

import { buddyProfileSchema, offerHelpSchema, parseLanguages, reverifySchema, toBuddyRow } from "./schemas";

const CITY = "11111111-1111-4111-8111-111111111111";

const valid = {
  cityId: CITY,
  neighbourhoodIds: [],
  bio: "  Lived here ten years  ",
  languages: "Urdu, Hindi ,English, urdu, ",
  helpTypes: ["general_advice" as const],
  isActive: true,
};

describe("parseLanguages", () => {
  it("splits, trims and removes blanks and duplicates", () => {
    expect(parseLanguages("Urdu, Hindi ,English, urdu, ")).toEqual(["Urdu", "Hindi", "English"]);
    expect(parseLanguages("")).toEqual([]);
  });
});

describe("buddyProfileSchema", () => {
  it("accepts a valid profile and builds the row", () => {
    const row = toBuddyRow(buddyProfileSchema.parse(valid));
    expect(row.bio).toBe("Lived here ten years");
    expect(row.languages).toEqual(["Urdu", "Hindi", "English"]);
    expect(row.city_id).toBe(CITY);
  });

  it("needs a city and at least one help type", () => {
    expect(buddyProfileSchema.safeParse({ ...valid, cityId: "" }).success).toBe(false);
    expect(buddyProfileSchema.safeParse({ ...valid, helpTypes: [] }).success).toBe(false);
  });

  it("allows at most 10 languages", () => {
    const many = Array.from({ length: 11 }, (_, i) => `Lang${i}`).join(",");
    expect(buddyProfileSchema.safeParse({ ...valid, languages: many }).success).toBe(false);
  });
});

describe("offer and re-verification schemas", () => {
  it("limit text length", () => {
    expect(offerHelpSchema.safeParse({ requestId: CITY, message: "" }).success).toBe(true);
    expect(offerHelpSchema.safeParse({ requestId: CITY, message: "x".repeat(1001) }).success).toBe(false);
    expect(reverifySchema.safeParse({ note: "x".repeat(1001) }).success).toBe(false);
  });
});
