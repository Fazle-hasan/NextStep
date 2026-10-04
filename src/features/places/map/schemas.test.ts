import { describe, expect, it } from "vitest";

import {
  boundsAround,
  boundsSchema,
  countActiveMapFilters,
  DEFAULT_PLACE_TYPES,
  filtersToFlatArgs,
  loadFlatsSchema,
  loadPlacesSchema,
  mapHref,
  parseMapSearch,
  type MapFilters,
} from "./schemas";

const CITY = "11111111-1111-4111-8111-111111111111";
const OTHER_CITY = "22222222-2222-4222-8222-222222222222";

const EMPTY: MapFilters = {
  cityId: null,
  masjidKm: null,
  workplace: null,
  workKm: null,
  rentMin: null,
  rentMax: null,
  listingTypes: [],
  placeTypes: DEFAULT_PLACE_TYPES,
};

describe("parseMapSearch", () => {
  it("falls back to the viewer's city and the default places layer", () => {
    expect(parseMapSearch({}, CITY)).toEqual({ ...EMPTY, cityId: CITY });
  });

  it("reads every filter from the URL", () => {
    const filters = parseMapSearch(
      {
        city: OTHER_CITY,
        masjidKm: "1",
        wlat: "19.07",
        wlng: "72.88",
        workKm: "5",
        rentMin: "8000",
        rentMax: "15000",
        types: ["private_room", "pg_hostel"],
        layers: ["halal_grocery"],
      },
      CITY,
    );
    expect(filters).toEqual({
      cityId: OTHER_CITY,
      masjidKm: 1,
      workplace: { lat: 19.07, lng: 72.88 },
      workKm: 5,
      rentMin: 8000,
      rentMax: 15000,
      listingTypes: ["private_room", "pg_hostel"],
      placeTypes: ["halal_grocery"],
    });
  });

  it("treats city=all as every city and layers=none as no places", () => {
    const filters = parseMapSearch({ city: "all", layers: "none" }, CITY);
    expect(filters.cityId).toBeNull();
    expect(filters.placeTypes).toEqual([]);
  });

  it("drops bad values instead of failing", () => {
    const filters = parseMapSearch(
      { city: "nope", masjidKm: "7", wlat: "200", wlng: "72.88", workKm: "5", rentMin: "-4", types: "castle", layers: "volcano" },
      null,
    );
    expect(filters).toEqual({ ...EMPTY, placeTypes: [] });
  });

  it("ignores a workplace radius without a workplace", () => {
    expect(parseMapSearch({ workKm: "5" }, null).workKm).toBeNull();
  });
});

describe("mapHref", () => {
  it("round-trips through parseMapSearch", () => {
    const filters: MapFilters = {
      cityId: CITY,
      masjidKm: 0.5,
      workplace: { lat: 19.07, lng: 72.88 },
      workKm: 10,
      rentMin: 5000,
      rentMax: 20000,
      listingTypes: ["entire_flat"],
      placeTypes: ["shia_masjid", "halal_restaurant"],
    };
    const params = Object.fromEntries(
      [...new Set(new URL(mapHref(filters), "http://x").searchParams.keys())].map((key) => {
        const all = new URL(mapHref(filters), "http://x").searchParams.getAll(key);
        return [key, all.length > 1 ? all : all[0]];
      }),
    );
    expect(parseMapSearch(params, null)).toEqual(filters);
  });

  it("writes city=all and layers=none explicitly", () => {
    expect(mapHref({ ...EMPTY, placeTypes: [] })).toBe("/map?city=all&layers=none");
    expect(mapHref(EMPTY)).toBe("/map?city=all");
  });
});

describe("filtersToFlatArgs", () => {
  it("converts rupees to paise and passes the viewport", () => {
    const args = filtersToFlatArgs(
      { ...EMPTY, cityId: CITY, masjidKm: 2, workplace: { lat: 19, lng: 72 }, workKm: 5, rentMin: 8000, rentMax: 15000 },
      { minLng: 72, minLat: 19, maxLng: 73, maxLat: 20 },
    );
    expect(args).toMatchObject({
      p_city_id: CITY,
      p_masjid_radius_km: 2,
      p_workplace_lat: 19,
      p_workplace_lng: 72,
      p_workplace_radius_km: 5,
      p_rent_min: 800_000,
      p_rent_max: 1_500_000,
      p_min_lng: 72,
      p_max_lat: 20,
    });
  });

  it("leaves unset filters out", () => {
    const args = filtersToFlatArgs(EMPTY, null);
    expect(args.p_city_id).toBeUndefined();
    expect(args.p_masjid_radius_km).toBeUndefined();
    expect(args.p_listing_types).toBeUndefined();
    expect(args.p_min_lng).toBeUndefined();
  });
});

describe("countActiveMapFilters", () => {
  it("counts only filters that narrow the flats", () => {
    expect(countActiveMapFilters({ ...EMPTY, cityId: CITY })).toBe(0);
    expect(countActiveMapFilters({ ...EMPTY, masjidKm: 1, rentMax: 9000, listingTypes: ["pg_hostel", "shared_room"] })).toBe(4);
  });
});

describe("boundsAround", () => {
  it("makes a box around the point", () => {
    const b = boundsAround({ lat: 19.07, lng: 72.88 }, 10);
    expect(b.minLat).toBeLessThan(19.07);
    expect(b.maxLat).toBeGreaterThan(19.07);
    expect(b.maxLng - b.minLng).toBeGreaterThan(b.maxLat - b.minLat);
    expect(boundsSchema.safeParse(b).success).toBe(true);
  });
});

describe("action input schemas", () => {
  it("rejects an inverted viewport", () => {
    expect(boundsSchema.safeParse({ minLng: 73, minLat: 19, maxLng: 72, maxLat: 20 }).success).toBe(false);
  });

  it("accepts valid flat and place requests", () => {
    expect(loadFlatsSchema.safeParse({ filters: EMPTY, bounds: null }).success).toBe(true);
    expect(
      loadPlacesSchema.safeParse({ bounds: { minLng: 72, minLat: 19, maxLng: 73, maxLat: 20 }, types: ["imambargah"] }).success,
    ).toBe(true);
    expect(loadPlacesSchema.safeParse({ bounds: { minLng: 72, minLat: 19, maxLng: 73, maxLat: 20 }, types: [] }).success).toBe(false);
  });

  it("rejects a rent outside the allowed range", () => {
    expect(loadFlatsSchema.safeParse({ filters: { ...EMPTY, rentMin: 0 }, bounds: null }).success).toBe(false);
  });
});
