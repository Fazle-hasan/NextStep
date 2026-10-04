import { z } from "zod";

import type { MapBounds, MapPoint } from "@/lib/maps";
import { rupeesToPaise } from "@/lib/utils/money";
import { Constants, type Database, type Enums } from "@/types/database";

export const LISTING_TYPES = Constants.public.Enums.listing_type;
export const PLACE_TYPES = Constants.public.Enums.place_type;

// Choices offered in the filter panel (kilometres).
export const MASJID_RADII = [0.5, 1, 2, 3, 5] as const;
export const WORKPLACE_RADII = [2, 5, 10, 15, 25] as const;
export const DEFAULT_PLACE_TYPES: Enums<"place_type">[] = ["shia_masjid", "imambargah"];

export const FLAT_LIMIT = 100;
export const PLACE_LIMIT = 300;
const MAX_RENT_RUPEES = 2_000_000;

// URL params arrive as string | string[] | undefined. Bad values are dropped instead of failing the page.
const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);
const list = (value: unknown) => (value == null || value === "" ? [] : Array.isArray(value) ? value : [value]);

function oneOf(options: readonly number[]) {
  return z.preprocess((value) => {
    const raw = first(value);
    if (raw == null || raw === "") return undefined;
    const n = Number(raw);
    return options.includes(n) ? n : undefined;
  }, z.number().optional());
}

function numberIn(min: number, max: number) {
  return z.preprocess((value) => {
    const raw = first(value);
    if (raw == null || raw === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
  }, z.number().optional());
}

function rupeesParam() {
  return z.preprocess((value) => {
    const raw = first(value);
    if (raw == null || raw === "") return undefined;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 1 && n <= MAX_RENT_RUPEES ? n : undefined;
  }, z.number().optional());
}

function enumList<T extends string>(values: readonly [T, ...T[]]) {
  return z.preprocess(
    (value) => [...new Set(list(value).filter((v): v is T => (values as readonly unknown[]).includes(v)))],
    z.array(z.enum(values)),
  );
}

const filterSchema = z.object({
  // A city id, "all" for every city, or undefined (the page then falls back to the viewer's own city).
  city: z.preprocess((value) => {
    const raw = first(value);
    return raw === "all" || z.guid().safeParse(raw).success ? raw : undefined;
  }, z.string().optional()),
  masjidKm: oneOf(MASJID_RADII),
  wlat: numberIn(-90, 90),
  wlng: numberIn(-180, 180),
  workKm: oneOf(WORKPLACE_RADII),
  // Whole rupees a month.
  rentMin: rupeesParam(),
  rentMax: rupeesParam(),
  types: enumList(LISTING_TYPES),
  // Place types drawn on the map. "none" hides the places layer; absent means the default (masjids and imambargahs).
  layers: z.preprocess((value) => {
    const items = list(value);
    if (items.length === 0) return undefined;
    if (items.includes("none")) return [];
    return [...new Set(items.filter((v) => (PLACE_TYPES as readonly unknown[]).includes(v)))];
  }, z.array(z.enum(PLACE_TYPES)).optional()),
});

export type MapFilters = {
  // null = all cities.
  cityId: string | null;
  masjidKm: number | null;
  workplace: MapPoint | null;
  workKm: number | null;
  rentMin: number | null;
  rentMax: number | null;
  listingTypes: Enums<"listing_type">[];
  placeTypes: Enums<"place_type">[];
};

export function parseMapSearch(
  params: Record<string, string | string[] | undefined>,
  defaultCityId: string | null,
): MapFilters {
  const p = filterSchema.parse(params);
  const workplace = p.wlat !== undefined && p.wlng !== undefined ? { lat: p.wlat, lng: p.wlng } : null;
  return {
    cityId: p.city === "all" ? null : (p.city ?? defaultCityId),
    masjidKm: p.masjidKm ?? null,
    workplace,
    // A workplace radius means nothing without a workplace.
    workKm: workplace ? (p.workKm ?? null) : null,
    rentMin: p.rentMin ?? null,
    rentMax: p.rentMax ?? null,
    listingTypes: p.types,
    placeTypes: p.layers ?? DEFAULT_PLACE_TYPES,
  };
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v));
}

export function mapHref(filters: MapFilters): string {
  const query = new URLSearchParams();
  query.set("city", filters.cityId ?? "all");
  if (filters.masjidKm !== null) query.set("masjidKm", String(filters.masjidKm));
  if (filters.workplace) {
    query.set("wlat", filters.workplace.lat.toFixed(6));
    query.set("wlng", filters.workplace.lng.toFixed(6));
    if (filters.workKm !== null) query.set("workKm", String(filters.workKm));
  }
  if (filters.rentMin !== null) query.set("rentMin", String(filters.rentMin));
  if (filters.rentMax !== null) query.set("rentMax", String(filters.rentMax));
  for (const type of filters.listingTypes) query.append("types", type);
  if (filters.placeTypes.length === 0) query.set("layers", "none");
  else if (!sameSet(filters.placeTypes, DEFAULT_PLACE_TYPES)) for (const type of filters.placeTypes) query.append("layers", type);
  return `/map?${query.toString()}`;
}

// Filters that narrow the flat results (the places layer and the city are not counted).
export function countActiveMapFilters(filters: MapFilters): number {
  return (
    [filters.masjidKm, filters.workKm, filters.rentMin, filters.rentMax].filter((v) => v !== null).length +
    filters.listingTypes.length
  );
}

type FlatArgs = Database["public"]["Functions"]["search_flats_near"]["Args"];

export function filtersToFlatArgs(filters: MapFilters, bounds: MapBounds | null): FlatArgs {
  return {
    p_city_id: filters.cityId ?? undefined,
    p_masjid_radius_km: filters.masjidKm ?? undefined,
    p_workplace_lat: filters.workplace?.lat,
    p_workplace_lng: filters.workplace?.lng,
    p_workplace_radius_km: filters.workplace ? (filters.workKm ?? undefined) : undefined,
    p_rent_min: filters.rentMin !== null ? rupeesToPaise(filters.rentMin) : undefined,
    p_rent_max: filters.rentMax !== null ? rupeesToPaise(filters.rentMax) : undefined,
    p_listing_types: filters.listingTypes.length ? filters.listingTypes : undefined,
    p_min_lng: bounds?.minLng,
    p_min_lat: bounds?.minLat,
    p_max_lng: bounds?.maxLng,
    p_max_lat: bounds?.maxLat,
    p_limit: FLAT_LIMIT,
    p_offset: 0,
  };
}

// A box of roughly `km` kilometres around a point, used before the map reports its real viewport.
export function boundsAround(center: MapPoint, km = 12): MapBounds {
  const dLat = km / 111.32;
  const dLng = km / (111.32 * Math.max(Math.cos((center.lat * Math.PI) / 180), 0.01));
  return {
    minLat: Math.max(center.lat - dLat, -90),
    maxLat: Math.min(center.lat + dLat, 90),
    minLng: Math.max(center.lng - dLng, -180),
    maxLng: Math.min(center.lng + dLng, 180),
  };
}

// Server action inputs -------------------------------------------------------------------

const pointSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

export const boundsSchema = z
  .object({
    minLng: z.number().min(-180).max(180),
    minLat: z.number().min(-90).max(90),
    maxLng: z.number().min(-180).max(180),
    maxLat: z.number().min(-90).max(90),
  })
  .refine((b) => b.maxLng > b.minLng && b.maxLat > b.minLat);

const mapFiltersSchema = z.object({
  cityId: z.uuid().nullable(),
  masjidKm: z.number().min(0.1).max(50).nullable(),
  workplace: pointSchema.nullable(),
  workKm: z.number().min(0.1).max(100).nullable(),
  rentMin: z.number().int().min(1).max(MAX_RENT_RUPEES).nullable(),
  rentMax: z.number().int().min(1).max(MAX_RENT_RUPEES).nullable(),
  listingTypes: z.array(z.enum(LISTING_TYPES)).max(LISTING_TYPES.length),
  placeTypes: z.array(z.enum(PLACE_TYPES)).max(PLACE_TYPES.length),
});

export const loadFlatsSchema = z.object({ filters: mapFiltersSchema, bounds: boundsSchema.nullable() });

export const loadPlacesSchema = z.object({
  bounds: boundsSchema,
  types: z.array(z.enum(PLACE_TYPES)).min(1).max(PLACE_TYPES.length),
});

export const areaCentreSchema = z.object({
  cityId: z.uuid().nullable(),
  neighbourhoodId: z.uuid().nullable(),
});
