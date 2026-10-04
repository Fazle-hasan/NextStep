import { describe, expect, it } from "vitest";

import {
  adminPlacesHref,
  buildRentRanges,
  guideFormSchema,
  parseAdminPlaceSearch,
  placeFormSchema,
  placePhotoSchema,
  suggestionReviewSchema,
} from "./schemas";

const CITY = "11111111-1111-4111-8111-111111111111";
const PLACE = "22222222-2222-4222-8222-222222222222";

const place = {
  id: "",
  name: "Sample Imambargah",
  placeType: "imambargah" as const,
  cityId: CITY,
  neighbourhoodId: "",
  address: "",
  phone: "",
  website: "",
  timings: "",
  notes: "",
  isVerified: true,
  lat: "19.07",
  lng: "72.88",
};

const emptyRent = {
  entire_flat: { min: "", max: "" },
  private_room: { min: "", max: "" },
  shared_room: { min: "", max: "" },
  pg_hostel: { min: "", max: "" },
};

describe("parseAdminPlaceSearch", () => {
  it("keeps valid filters and drops junk", () => {
    const { filters, page } = parseAdminPlaceSearch({ q: "  masjid ", city: "nope", type: "imambargah", state: "hidden", page: "3" });
    expect(filters).toEqual({ q: "masjid", city: undefined, type: "imambargah", state: "hidden" });
    expect(page).toBe(3);
    expect(parseAdminPlaceSearch({ state: "weird", page: "-1" })).toEqual({
      filters: { q: undefined, city: undefined, type: undefined, state: undefined },
      page: 1,
    });
  });

  it("builds a link back to the list", () => {
    expect(adminPlacesHref({ q: "a b", state: "unverified" }, 2)).toBe("/admin/places?q=a+b&state=unverified&page=2");
    expect(adminPlacesHref({})).toBe("/admin/places");
  });
});

describe("placeFormSchema", () => {
  it("accepts a place and turns the coordinates into numbers", () => {
    const parsed = placeFormSchema.parse(place);
    expect(parsed.lat).toBe(19.07);
    expect(parsed.lng).toBe(72.88);
    expect(parsed.id).toBeNull();
    expect(parsed.address).toBeNull();
  });

  it("requires a valid location", () => {
    expect(placeFormSchema.safeParse({ ...place, lat: "" }).success).toBe(false);
    expect(placeFormSchema.safeParse({ ...place, lat: "95" }).success).toBe(false);
    expect(placeFormSchema.safeParse({ ...place, lng: "abc" }).success).toBe(false);
  });

  it("rejects a website that is not http(s)", () => {
    expect(placeFormSchema.safeParse({ ...place, website: "javascript:alert(1)" }).success).toBe(false);
    expect(placeFormSchema.safeParse({ ...place, website: "https://example.test" }).success).toBe(true);
  });
});

describe("placePhotoSchema", () => {
  it("only accepts a path inside the place folder", () => {
    expect(placePhotoSchema.safeParse({ placeId: PLACE, storagePath: `${PLACE}/abc-123.jpg`, position: 0 }).success).toBe(true);
    expect(placePhotoSchema.safeParse({ placeId: PLACE, storagePath: `${CITY}/abc.jpg`, position: 0 }).success).toBe(false);
    expect(placePhotoSchema.safeParse({ placeId: PLACE, storagePath: `${PLACE}/../x.jpg`, position: 0 }).success).toBe(false);
  });
});

describe("guideFormSchema", () => {
  const guide = {
    neighbourhoodId: CITY,
    summary: "A settled area.",
    rent: { ...emptyRent, private_room: { min: "8000", max: "15000" } },
    commuteNotes: "",
    safetyNotes: "",
    halalFoodNotes: "",
    isPublished: true,
  };

  it("converts filled rent rows to paise and leaves empty rows out", () => {
    const parsed = guideFormSchema.parse(guide);
    expect(buildRentRanges(parsed.rent)).toEqual({ private_room: { min: 800000, max: 1500000 } });
  });

  it("rejects a half-filled or reversed rent row", () => {
    expect(guideFormSchema.safeParse({ ...guide, rent: { ...emptyRent, shared_room: { min: "5000", max: "" } } }).success).toBe(false);
    expect(guideFormSchema.safeParse({ ...guide, rent: { ...emptyRent, shared_room: { min: "9000", max: "5000" } } }).success).toBe(false);
  });

  it("requires a summary", () => {
    expect(guideFormSchema.safeParse({ ...guide, summary: "  " }).success).toBe(false);
  });
});

describe("suggestionReviewSchema", () => {
  it("limits the note length", () => {
    expect(suggestionReviewSchema.safeParse({ id: PLACE, approve: false, reason: "x".repeat(1001) }).success).toBe(false);
    expect(suggestionReviewSchema.safeParse({ id: PLACE, approve: true }).success).toBe(true);
  });
});
