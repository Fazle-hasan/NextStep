import { describe, expect, it } from "vitest";

import {
  EMPTY_SUGGESTION,
  hasPlaceFilters,
  likePattern,
  parsePlaceSearch,
  placesHref,
  suggestionPayload,
  suggestionSchema,
} from "./schemas";

const CITY = "11111111-1111-4111-8111-111111111111";
const AREA = "22222222-2222-4222-8222-222222222222";

describe("parsePlaceSearch", () => {
  it("keeps valid filters and drops junk", () => {
    const { filters, page } = parsePlaceSearch({ q: "  Imam  ", city: CITY, area: "nope", type: "imambargah", page: "3" });
    expect(filters).toEqual({ q: "Imam", city: CITY, area: undefined, type: "imambargah" });
    expect(page).toBe(3);
  });

  it("falls back to page 1 and no filters", () => {
    const { filters, page } = parsePlaceSearch({ type: "castle", page: "-2" });
    expect(hasPlaceFilters(filters)).toBe(false);
    expect(page).toBe(1);
  });

  it("uses the first value of repeated params", () => {
    expect(parsePlaceSearch({ type: ["shia_masjid", "imambargah"] }).filters.type).toBe("shia_masjid");
  });
});

describe("placesHref", () => {
  it("builds a link that keeps the filters", () => {
    expect(placesHref({ q: "noor", city: CITY, area: undefined, type: "halal_grocery" }, 2)).toBe(
      `/places?q=noor&city=${CITY}&type=halal_grocery&page=2`,
    );
    expect(placesHref({ q: undefined, city: undefined, area: undefined, type: undefined })).toBe("/places");
  });
});

describe("likePattern", () => {
  it("escapes wildcards", () => {
    expect(likePattern("50%_off")).toBe("%50\\%\\_off%");
  });
});

describe("suggestionSchema", () => {
  const valid = { ...EMPTY_SUGGESTION, name: "Sample Imambargah", placeType: "imambargah" as const, cityId: CITY };

  it("accepts a minimal new place and empties optional fields", () => {
    const parsed = suggestionSchema.parse(valid);
    expect(parsed.placeId).toBeNull();
    expect(parsed.address).toBeNull();
    expect(suggestionPayload(parsed)).toEqual({ name: "Sample Imambargah", place_type: "imambargah", city_id: CITY });
  });

  it("includes filled fields and the location in the payload", () => {
    const parsed = suggestionSchema.parse({
      ...valid,
      neighbourhoodId: AREA,
      timings: " Majlis every Thursday ",
      website: "https://example.test/place",
      phone: "+91 00000 00001",
      location: { lat: 19.07, lng: 72.88 },
      note: "I pray here",
    });
    expect(suggestionPayload(parsed)).toEqual({
      name: "Sample Imambargah",
      place_type: "imambargah",
      city_id: CITY,
      neighbourhood_id: AREA,
      timings: "Majlis every Thursday",
      phone: "+91 00000 00001",
      website: "https://example.test/place",
      lat: 19.07,
      lng: 72.88,
    });
    expect(parsed.note).toBe("I pray here");
  });

  it("rejects bad values", () => {
    expect(suggestionSchema.safeParse({ ...valid, name: "x" }).success).toBe(false);
    expect(suggestionSchema.safeParse({ ...valid, cityId: "" }).success).toBe(false);
    expect(suggestionSchema.safeParse({ ...valid, website: "javascript:alert(1)" }).success).toBe(false);
    expect(suggestionSchema.safeParse({ ...valid, phone: "call me maybe" }).success).toBe(false);
    expect(suggestionSchema.safeParse({ ...valid, location: { lat: 190, lng: 72 } }).success).toBe(false);
    expect(suggestionSchema.safeParse({ ...valid, placeId: "not-a-uuid" }).success).toBe(false);
    expect(suggestionSchema.safeParse({ ...valid, note: "x".repeat(1001) }).success).toBe(false);
  });
});
