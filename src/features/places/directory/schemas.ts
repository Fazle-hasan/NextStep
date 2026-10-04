import { z } from "zod";

import { Constants } from "@/types/database";

import { placesStrings } from "./strings";

const { errors } = placesStrings;

export const PLACE_TYPES = Constants.public.Enums.place_type;
export const PAGE_SIZE = 24;

// Directory filters (URL search params) ------------------------------------------------

type RawParams = Record<string, string | string[] | undefined>;

function first(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

const uuidParam = z.preprocess(
  (value) => (z.guid().safeParse(first(value)).success ? first(value) : undefined),
  z.string().optional(),
);

const filtersSchema = z.object({
  q: z.preprocess((value) => {
    const text = typeof first(value) === "string" ? (first(value) as string).trim().slice(0, 80) : "";
    return text || undefined;
  }, z.string().optional()),
  city: uuidParam,
  area: uuidParam,
  type: z.preprocess(
    (value) => (z.enum(PLACE_TYPES).safeParse(first(value)).success ? first(value) : undefined),
    z.enum(PLACE_TYPES).optional(),
  ),
});

export type PlaceFilters = z.output<typeof filtersSchema>;

export function parsePlaceSearch(params: RawParams): { filters: PlaceFilters; page: number } {
  const filters = filtersSchema.parse({ q: params.q, city: params.city, area: params.area, type: params.type });
  const rawPage = Number(first(params.page));
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 500 ? rawPage : 1;
  return { filters, page };
}

export function hasPlaceFilters(filters: PlaceFilters): boolean {
  return Boolean(filters.q || filters.city || filters.area || filters.type);
}

export function placesHref(filters: PlaceFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.city) params.set("city", filters.city);
  if (filters.area) params.set("area", filters.area);
  if (filters.type) params.set("type", filters.type);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/places?${query}` : "/places";
}

// Escapes the LIKE wildcards in user text.
export function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

// Suggestion form -------------------------------------------------------------------------

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || null);

const optionalUuid = z
  .string()
  .refine((value) => value === "" || z.guid().safeParse(value).success, errors.invalid)
  .transform((value) => value || null);

export const suggestionSchema = z.object({
  // Set when correcting an existing place.
  placeId: optionalUuid,
  name: z.string().trim().min(2, errors.name).max(150, errors.name),
  placeType: z.enum(PLACE_TYPES, errors.type),
  cityId: z.guid(errors.city),
  neighbourhoodId: optionalUuid,
  address: optionalText(300, errors.address),
  timings: optionalText(1000, errors.timings),
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
  notes: optionalText(2000, errors.notes),
  location: z
    .object({
      lat: z.number().min(-90, errors.location).max(90, errors.location),
      lng: z.number().min(-180, errors.location).max(180, errors.location),
    })
    .nullable(),
  note: optionalText(1000, errors.note),
});

export type SuggestionInput = z.input<typeof suggestionSchema>;
export type SuggestionValues = z.output<typeof suggestionSchema>;

// The proposed fields as stored in place_suggestions.payload (empty values left out).
export function suggestionPayload(values: SuggestionValues): Record<string, string | number> {
  const payload: Record<string, string | number> = {
    name: values.name,
    place_type: values.placeType,
    city_id: values.cityId,
  };
  if (values.neighbourhoodId) payload.neighbourhood_id = values.neighbourhoodId;
  if (values.address) payload.address = values.address;
  if (values.timings) payload.timings = values.timings;
  if (values.phone) payload.phone = values.phone;
  if (values.website) payload.website = values.website;
  if (values.notes) payload.notes = values.notes;
  if (values.location) {
    payload.lat = values.location.lat;
    payload.lng = values.location.lng;
  }
  return payload;
}

export const EMPTY_SUGGESTION: SuggestionInput = {
  placeId: "",
  name: "",
  placeType: "imambargah",
  cityId: "",
  neighbourhoodId: "",
  address: "",
  timings: "",
  phone: "",
  website: "",
  notes: "",
  location: null,
  note: "",
};
