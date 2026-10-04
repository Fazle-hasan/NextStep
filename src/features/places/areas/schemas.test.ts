import { describe, expect, it } from "vitest";

import { parseRentRanges, slugSchema, tipSchema, voteSchema } from "./schemas";

const ID = "3f2c1a9e-5b7d-4c8e-9a1b-2d3e4f5a6b7c";

describe("tipSchema", () => {
  it("accepts a tip and trims it", () => {
    const parsed = tipSchema.safeParse({ neighbourhoodId: ID, body: "  Trains are packed before 9am.  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.body).toBe("Trains are packed before 9am.");
  });

  it("rejects tips that are too short or too long", () => {
    expect(tipSchema.safeParse({ neighbourhoodId: ID, body: "Hi" }).success).toBe(false);
    expect(tipSchema.safeParse({ neighbourhoodId: ID, body: "    a    " }).success).toBe(false);
    expect(tipSchema.safeParse({ neighbourhoodId: ID, body: "x".repeat(501) }).success).toBe(false);
    expect(tipSchema.safeParse({ neighbourhoodId: ID, body: "x".repeat(500) }).success).toBe(true);
  });

  it("needs a valid neighbourhood id", () => {
    expect(tipSchema.safeParse({ neighbourhoodId: "kurla", body: "A useful tip" }).success).toBe(false);
  });
});

describe("voteSchema", () => {
  it("needs a tip id and a boolean", () => {
    expect(voteSchema.safeParse({ tipId: ID, upvote: true }).success).toBe(true);
    expect(voteSchema.safeParse({ tipId: ID, upvote: "yes" }).success).toBe(false);
    expect(voteSchema.safeParse({ tipId: "1", upvote: false }).success).toBe(false);
  });
});

describe("slugSchema", () => {
  it("accepts slugs and rejects anything else", () => {
    expect(slugSchema.safeParse("andheri-west").success).toBe(true);
    expect(slugSchema.safeParse("Andheri West").success).toBe(false);
    expect(slugSchema.safeParse("../etc").success).toBe(false);
    expect(slugSchema.safeParse("").success).toBe(false);
  });
});

describe("parseRentRanges", () => {
  it("reads ranges in listing-type order", () => {
    expect(
      parseRentRanges({
        shared_room: { min: 500000, max: 900000 },
        entire_flat: { min: 2500000 },
        private_room: { max: 1500000 },
      }),
    ).toEqual([
      { type: "entire_flat", min: 2500000, max: null },
      { type: "private_room", min: null, max: 1500000 },
      { type: "shared_room", min: 500000, max: 900000 },
    ]);
  });

  it("drops unknown types and malformed values", () => {
    expect(
      parseRentRanges({
        villa: { min: 1, max: 2 },
        entire_flat: { min: "cheap" },
        private_room: { min: 900000, max: 100000 },
        shared_room: {},
        pg_hostel: { min: -5 },
      }),
    ).toEqual([]);
  });

  it("returns nothing for non-objects", () => {
    expect(parseRentRanges(null)).toEqual([]);
    expect(parseRentRanges([1, 2])).toEqual([]);
    expect(parseRentRanges("x")).toEqual([]);
  });
});
