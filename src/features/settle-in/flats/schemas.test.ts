import { describe, expect, it } from "vitest";

import {
  addressSchema,
  contactRequestSchema,
  filtersToRpcArgs,
  flatsHref,
  listingCreateSchema,
  listingStatusSchema,
  PAGE_SIZE,
  parseFlatSearch,
  photoAddSchema,
} from "./schemas";

const CITY = "11111111-1111-4111-8111-111111111111";
const LISTING = "22222222-2222-4222-8222-222222222222";

const validListing = {
  listingType: "private_room",
  cityId: CITY,
  neighbourhoodId: "",
  title: "Sunny room near the station",
  description: "",
  rent: "15000",
  deposit: "",
  furnishing: "semi",
  availableFrom: "2026-11-01",
  minStayMonths: "",
  bedrooms: "1",
  bathrooms: "",
  amenities: ["wifi", "ac"],
  foodPref: "",
  tenantGenderPref: "any",
};

describe("parseFlatSearch", () => {
  it("keeps valid filters and drops bad ones", () => {
    const { filters, page } = parseFlatSearch({
      city: CITY,
      area: "not-a-uuid",
      rentMin: "5000",
      rentMax: "-3",
      types: ["private_room", "castle"],
      furnishing: "full",
      page: "3",
    });
    expect(filters).toEqual({
      city: CITY,
      area: undefined,
      rentMin: 5000,
      rentMax: undefined,
      types: ["private_room"],
      furnishing: "full",
    });
    expect(page).toBe(3);
  });

  it("defaults to page 1 and no filters", () => {
    const { filters, page } = parseFlatSearch({ page: "abc" });
    expect(filters.types).toEqual([]);
    expect(page).toBe(1);
  });

  it("converts rupees to paise and pages to offsets for the RPC", () => {
    const { filters } = parseFlatSearch({ rentMax: "20000", types: "entire_flat" });
    expect(filtersToRpcArgs(filters, 2)).toMatchObject({
      p_rent_max: 2_000_000,
      p_listing_types: ["entire_flat"],
      p_limit: PAGE_SIZE,
      p_offset: PAGE_SIZE,
    });
  });

  it("builds links that keep the filters", () => {
    const { filters } = parseFlatSearch({ city: CITY, types: ["private_room", "shared_room"] });
    expect(flatsHref(filters, 2)).toBe(`/flats?city=${CITY}&types=private_room&types=shared_room&page=2`);
    expect(flatsHref(parseFlatSearch({}).filters)).toBe("/flats");
  });
});

describe("listingCreateSchema", () => {
  it("converts form strings", () => {
    const parsed = listingCreateSchema.parse(validListing);
    expect(parsed.rent).toBe(15000);
    expect(parsed.deposit).toBeUndefined();
    expect(parsed.bedrooms).toBe(1);
    expect(parsed.neighbourhoodId).toBeUndefined();
    expect(parsed.foodPref).toBeUndefined();
  });

  it.each([
    ["rent", "0"],
    ["rent", "12.5"],
    ["rent", "abc"],
    ["title", "Hey"],
    ["availableFrom", "next week"],
    ["bedrooms", "99"],
    ["tenantGenderPref", "robots"],
    ["cityId", ""],
  ])("rejects %s = %s", (field, value) => {
    expect(listingCreateSchema.safeParse({ ...validListing, [field]: value }).success).toBe(false);
  });

  it("rejects unknown amenities", () => {
    expect(listingCreateSchema.safeParse({ ...validListing, amenities: ["helipad"] }).success).toBe(false);
  });
});

describe("addressSchema", () => {
  it("allows a missing location (the server falls back to the area centre)", () => {
    const parsed = addressSchema.parse({ listingId: LISTING, addressLine: "12 Fake Street", landmark: "", lat: null, lng: null });
    expect(parsed.landmark).toBeUndefined();
    expect(parsed.lat).toBeNull();
  });

  it("rejects a short address and out-of-range coordinates", () => {
    expect(addressSchema.safeParse({ listingId: LISTING, addressLine: "x", landmark: "", lat: null, lng: null }).success).toBe(false);
    expect(
      addressSchema.safeParse({ listingId: LISTING, addressLine: "12 Fake Street", landmark: "", lat: 120, lng: 72 }).success,
    ).toBe(false);
  });
});

describe("photoAddSchema", () => {
  it("accepts a path inside the listing folder only", () => {
    expect(photoAddSchema.safeParse({ listingId: LISTING, path: `${LISTING}/abc.jpg` }).success).toBe(true);
    expect(photoAddSchema.safeParse({ listingId: LISTING, path: `${CITY}/abc.jpg` }).success).toBe(false);
    expect(photoAddSchema.safeParse({ listingId: LISTING, path: `${LISTING}/../x.jpg` }).success).toBe(false);
  });
});

describe("other schemas", () => {
  it("does not let a lister set 'expired' by hand", () => {
    expect(listingStatusSchema.safeParse({ listingId: LISTING, status: "expired" }).success).toBe(false);
    expect(listingStatusSchema.safeParse({ listingId: LISTING, status: "paused" }).success).toBe(true);
  });

  it("requires an introduction", () => {
    expect(contactRequestSchema.safeParse({ listingId: LISTING, intro: "   " }).success).toBe(false);
    expect(contactRequestSchema.safeParse({ listingId: LISTING, intro: "Salaam" }).success).toBe(true);
  });
});
