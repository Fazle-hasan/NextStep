import { describe, expect, it } from "vitest";

import { closeRequestSchema, rateBuddySchema, requestFormSchema, respondOfferSchema, toRequestRow } from "./schemas";

const CITY = "11111111-1111-4111-8111-111111111111";
const AREA = "22222222-2222-4222-8222-222222222222";

const valid = {
  cityId: CITY,
  neighbourhoodIds: [AREA],
  moveFrom: "2026-11-01",
  moveTo: "",
  workplaceAddress: "",
  pinAction: "clear" as const,
  workplaceLat: null,
  workplaceLng: null,
  budgetMin: "8000",
  budgetMax: "15000",
  household: "alone" as const,
  needs: ["flat" as const, "nearby_masjid" as const],
  note: "",
  sameGenderOnly: false,
};

describe("requestFormSchema", () => {
  it("accepts a valid request", () => {
    expect(requestFormSchema.safeParse(valid).success).toBe(true);
  });

  it("needs a city, a move date, a household and at least one need", () => {
    expect(requestFormSchema.safeParse({ ...valid, cityId: "" }).success).toBe(false);
    expect(requestFormSchema.safeParse({ ...valid, moveFrom: "" }).success).toBe(false);
    expect(requestFormSchema.safeParse({ ...valid, household: "" }).success).toBe(false);
    expect(requestFormSchema.safeParse({ ...valid, needs: [] }).success).toBe(false);
  });

  it("rejects a range that ends before it starts", () => {
    expect(requestFormSchema.safeParse({ ...valid, moveTo: "2026-10-01" }).success).toBe(false);
    expect(requestFormSchema.safeParse({ ...valid, moveTo: "2026-11-20" }).success).toBe(true);
  });

  it("rejects bad budgets", () => {
    expect(requestFormSchema.safeParse({ ...valid, budgetMin: "abc" }).success).toBe(false);
    expect(requestFormSchema.safeParse({ ...valid, budgetMin: "20000", budgetMax: "10000" }).success).toBe(false);
    expect(requestFormSchema.safeParse({ ...valid, budgetMin: "", budgetMax: "" }).success).toBe(true);
  });

  it("needs coordinates when a pin is set", () => {
    expect(requestFormSchema.safeParse({ ...valid, pinAction: "set" }).success).toBe(false);
    expect(requestFormSchema.safeParse({ ...valid, pinAction: "set", workplaceLat: 19.07, workplaceLng: 72.88 }).success).toBe(true);
    expect(requestFormSchema.safeParse({ ...valid, pinAction: "set", workplaceLat: 190, workplaceLng: 72.88 }).success).toBe(false);
  });
});

describe("toRequestRow", () => {
  it("converts rupees to paise and blanks to null", () => {
    const row = toRequestRow(requestFormSchema.parse(valid));
    expect(row.budget_min).toBe(800_000);
    expect(row.budget_max).toBe(1_500_000);
    expect(row.move_to).toBeNull();
    expect(row.note).toBeNull();
    expect(row).toHaveProperty("workplace_location", null);
  });

  it("writes the pin as EWKT (longitude first) and leaves it alone on keep", () => {
    const set = toRequestRow(requestFormSchema.parse({ ...valid, pinAction: "set", workplaceLat: 19.07, workplaceLng: 72.88 }));
    expect(set).toHaveProperty("workplace_location", "SRID=4326;POINT(72.88 19.07)");
    const keep = toRequestRow(requestFormSchema.parse({ ...valid, pinAction: "keep" }));
    expect(keep).not.toHaveProperty("workplace_location");
  });
});

describe("action schemas", () => {
  it("validate ids", () => {
    expect(respondOfferSchema.safeParse({ offerId: CITY, accept: true }).success).toBe(true);
    expect(respondOfferSchema.safeParse({ offerId: "x", accept: true }).success).toBe(false);
    expect(closeRequestSchema.safeParse({ requestId: CITY, cancel: false }).success).toBe(true);
  });

  it("rating must be 1 to 5", () => {
    const base = { requestId: CITY, buddyId: AREA, comment: "" };
    expect(rateBuddySchema.safeParse({ ...base, rating: "5" }).success).toBe(true);
    expect(rateBuddySchema.safeParse({ ...base, rating: 0 }).success).toBe(false);
    expect(rateBuddySchema.safeParse({ ...base, rating: 6 }).success).toBe(false);
  });
});
