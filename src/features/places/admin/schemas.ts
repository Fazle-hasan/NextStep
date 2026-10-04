import { z } from "zod";

import { rupeesToPaise } from "@/lib/utils/money";
import { Constants } from "@/types/database";

import { placesAdminStrings } from "./strings";
import type { ListingType } from "./types";

const { errors } = placesAdminStrings;

export const PLACE_TYPES = Constants.public.Enums.place_type;
export const LISTING_TYPES = Constants.public.Enums.listing_type;
export const PLACE_STATES = ["verified", "unverified", "hidden"] as const;
export const ADMIN_PAGE_SIZE = 30;
export const MAX_PLACE_PHOTOS = 20;

// List filters (URL search params) -----------------------------------------------------

type RawParams = Record<string, string | string[] | undefined>;

function first(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(values: readonly T[]) {
  return z.preprocess(
    (value) => (values.includes(first(value) as T) ? first(value) : undefined),
    z.enum(values as [T, ...T[]]).optional(),
  );
}

const filtersSchema = z.object({
  q: z.preprocess((value) => {
    const text = typeof first(value) === "string" ? (first(value) as string).trim().slice(0, 80) : "";
    return text || undefined;
  }, z.string().optional()),
  city: z.preprocess((value) => (z.guid().safeParse(first(value)).success ? first(value) : undefined), z.string().optional()),
  type: oneOf(PLACE_TYPES),
  state: oneOf(PLACE_STATES),
});

export type AdminPlaceFilters = z.output<typeof filtersSchema>;

export function parseAdminPlaceSearch(params: RawParams): { filters: AdminPlaceFilters; page: number } {
  const filters = filtersSchema.parse({ q: params.q, city: params.city, type: params.type, state: params.state });
  const rawPage = Number(first(params.page));
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 500 ? rawPage : 1;
  return { filters, page };
}

export function adminPlacesHref(filters: AdminPlaceFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.city) params.set("city", filters.city);
  if (filters.type) params.set("type", filters.type);
  if (filters.state) params.set("state", filters.state);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/places?${query}` : "/admin/places";
}

// Escapes the LIKE wildcards in user text.
export function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

// Place form ----------------------------------------------------------------------------

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || null);

const optionalUuid = (message: string) =>
  z
    .string()
    .refine((value) => value === "" || z.guid().safeParse(value).success, message)
    .transform((value) => value || null);

function coordinate(limit: number) {
  return z
    .string()
    .trim()
    .refine((value) => value !== "" && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit, errors.location)
    .transform((value) => Number(value));
}

export const placeFormSchema = z.object({
  // Empty when adding a place.
  id: optionalUuid(errors.invalid),
  name: z.string().trim().min(2, errors.name).max(150, errors.name),
  placeType: z.enum(PLACE_TYPES, errors.type),
  cityId: z.guid(errors.city),
  neighbourhoodId: optionalUuid(errors.area),
  address: optionalText(300, errors.address),
  phone: z
    .string()
    .trim()
    .refine((value) => value === "" || /^[0-9+\-() ]{5,30}$/.test(value), errors.phone)
    .transform((value) => value || null),
  website: z
    .string()
    .trim()
    .refine((value) => value === "" || (/^https?:\/\/\S+\.\S+$/.test(value) && value.length <= 300), errors.website)
    .transform((value) => value || null),
  timings: optionalText(1000, errors.timings),
  notes: optionalText(2000, errors.notes),
  isVerified: z.boolean(),
  lat: coordinate(90),
  lng: coordinate(180),
});

export type PlaceFormInput = z.input<typeof placeFormSchema>;
export type PlaceFormValues = z.output<typeof placeFormSchema>;

export const placeFlagSchema = z.object({ id: z.guid(), value: z.boolean() });
export const idSchema = z.object({ id: z.guid() });

export const suggestionReviewSchema = z.object({
  id: z.guid(),
  approve: z.boolean(),
  reason: z.string().trim().max(1000, errors.note_too_long).optional(),
});

// Photos: '{place_id}/{uuid}.jpg' in the place-photos bucket.
export const placePhotoSchema = z
  .object({
    placeId: z.guid(),
    storagePath: z.string().max(300),
    position: z.number().int().min(0).max(MAX_PLACE_PHOTOS - 1),
  })
  .refine((value) => new RegExp(`^${value.placeId}/[A-Za-z0-9-]+\\.jpg$`).test(value.storagePath), {
    message: errors.photoPath,
    path: ["storagePath"],
  });

// Area guide form ---------------------------------------------------------------------------

const rupees = z
  .string()
  .trim()
  .refine((value) => value === "" || (/^\d{1,8}$/.test(value) && Number(value) > 0), errors.rent);

const rentRow = z
  .object({ min: rupees, max: rupees })
  .refine((row) => (row.min === "") === (row.max === ""), { message: errors.rent, path: ["max"] })
  .refine((row) => row.min === "" || Number(row.max) >= Number(row.min), { message: errors.rent, path: ["max"] });

export const guideFormSchema = z.object({
  neighbourhoodId: z.guid(),
  summary: z.string().trim().min(1, errors.summary).max(5000, errors.summary),
  rent: z.object({
    entire_flat: rentRow,
    private_room: rentRow,
    shared_room: rentRow,
    pg_hostel: rentRow,
  }),
  commuteNotes: optionalText(2000, errors.guideNote),
  safetyNotes: optionalText(2000, errors.guideNote),
  halalFoodNotes: optionalText(2000, errors.guideNote),
  isPublished: z.boolean(),
});

export type GuideFormInput = z.input<typeof guideFormSchema>;
export type GuideFormValues = z.output<typeof guideFormSchema>;

// The rent_ranges jsonb: monthly paise per listing type; empty rows are left out.
export function buildRentRanges(rent: GuideFormValues["rent"]): Partial<Record<ListingType, { min: number; max: number }>> {
  const ranges: Partial<Record<ListingType, { min: number; max: number }>> = {};
  for (const type of LISTING_TYPES) {
    const row = rent[type];
    if (row.min !== "" && row.max !== "") {
      ranges[type] = { min: rupeesToPaise(Number(row.min)), max: rupeesToPaise(Number(row.max)) };
    }
  }
  return ranges;
}

export const tipHiddenSchema = z.object({ id: z.guid(), hidden: z.boolean(), neighbourhoodId: z.guid() });
