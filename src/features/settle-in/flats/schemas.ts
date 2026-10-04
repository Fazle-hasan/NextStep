import { z } from "zod";

import { rupeesToPaise } from "@/lib/utils/money";
import { Constants, type Database, type Enums } from "@/types/database";

import { AMENITY_KEYS } from "./labels";
import { flatsStrings } from "./strings";

const { errors } = flatsStrings;

export const LISTING_TYPES = Constants.public.Enums.listing_type;
export const FURNISHINGS = Constants.public.Enums.furnishing;
export const FOOD_PREFS = Constants.public.Enums.food_pref;
export const TENANT_GENDER_PREFS = Constants.public.Enums.tenant_gender_pref;

export const PAGE_SIZE = 12;
// Rent and deposit are stored as integer paise, so they are capped well below the integer limit.
const MAX_RENT_RUPEES = 2_000_000;
const MAX_DEPOSIT_RUPEES = 20_000_000;

// Search filters (URL) ---------------------------------------------------------------
// URL params arrive as string | string[] | undefined. Bad values are dropped instead of failing the page.
const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);
const list = (value: unknown) => (value == null || value === "" ? [] : Array.isArray(value) ? value : [value]);

const uuidParam = z.preprocess(
  (value) => (z.guid().safeParse(first(value)).success ? first(value) : undefined),
  z.string().optional(),
);

function rupeesParam(max: number) {
  return z.preprocess((value) => {
    const raw = first(value);
    if (raw == null || raw === "") return undefined;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 1 && n <= max ? n : undefined;
  }, z.number().optional());
}

const filterShape = {
  city: uuidParam,
  area: uuidParam,
  // Whole rupees a month.
  rentMin: rupeesParam(MAX_RENT_RUPEES),
  rentMax: rupeesParam(MAX_RENT_RUPEES),
  types: z.preprocess(
    (value) => [
      ...new Set(list(value).filter((v): v is Enums<"listing_type"> => (LISTING_TYPES as readonly unknown[]).includes(v))),
    ],
    z.array(z.enum(LISTING_TYPES)),
  ),
  furnishing: z.preprocess(
    (value) => ((FURNISHINGS as readonly unknown[]).includes(first(value)) ? first(value) : undefined),
    z.enum(FURNISHINGS).optional(),
  ),
};

const filterSchema = z.object(filterShape);
export type FlatFilters = z.output<typeof filterSchema>;

const pageSchema = z.preprocess((value) => {
  const n = Number(first(value));
  return Number.isInteger(n) && n >= 1 && n <= 500 ? n : 1;
}, z.number());

export function parseFlatSearch(params: Record<string, string | string[] | undefined>): { filters: FlatFilters; page: number } {
  return { filters: filterSchema.parse(params), page: pageSchema.parse(params.page) };
}

export function countActiveFilters(filters: FlatFilters): number {
  return (
    [filters.city, filters.area, filters.rentMin, filters.rentMax, filters.furnishing].filter((v) => v !== undefined).length +
    filters.types.length
  );
}

export function flatsHref(filters: FlatFilters, page = 1): string {
  const query = new URLSearchParams();
  if (filters.city) query.set("city", filters.city);
  if (filters.area) query.set("area", filters.area);
  if (filters.rentMin !== undefined) query.set("rentMin", String(filters.rentMin));
  if (filters.rentMax !== undefined) query.set("rentMax", String(filters.rentMax));
  for (const type of filters.types) query.append("types", type);
  if (filters.furnishing) query.set("furnishing", filters.furnishing);
  if (page > 1) query.set("page", String(page));
  const text = query.toString();
  return text ? `/flats?${text}` : "/flats";
}

type SearchArgs = Database["public"]["Functions"]["search_flats"]["Args"];

export function filtersToRpcArgs(filters: FlatFilters, page: number): SearchArgs {
  return {
    p_city_id: filters.city,
    p_neighbourhood_id: filters.area,
    p_rent_min: filters.rentMin !== undefined ? rupeesToPaise(filters.rentMin) : undefined,
    p_rent_max: filters.rentMax !== undefined ? rupeesToPaise(filters.rentMax) : undefined,
    p_listing_types: filters.types.length ? filters.types : undefined,
    p_furnishing: filters.furnishing,
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  };
}

// Listing form -------------------------------------------------------------------------
// Form fields are strings ("" = nothing typed); the schema converts them.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, errors.tooLong(max))
    .transform((v) => (v === "" ? undefined : v));

const optionalUuid = z.union([z.uuid(), z.literal("")]).transform((v) => (v === "" ? undefined : v));

const inRange = (value: string, min: number, max: number) => /^\d{1,9}$/.test(value) && Number(value) >= min && Number(value) <= max;

const wholeNumber = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => inRange(v, min, max), message)
    .transform(Number);

const optionalWholeNumber = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || inRange(v, min, max), message)
    .transform((v) => (v === "" ? undefined : Number(v)));

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, errors.date)
  .refine((v) => !Number.isNaN(Date.parse(v)), errors.date);

const listingFields = {
  listingType: z.enum(LISTING_TYPES, { error: errors.choose }),
  cityId: z.uuid({ error: errors.choose }),
  neighbourhoodId: optionalUuid,
  title: z.string().trim().min(5, errors.title).max(120, errors.title),
  description: optionalText(4000),
  // Whole rupees; converted to paise by the server action.
  rent: wholeNumber(1, MAX_RENT_RUPEES, errors.rent),
  deposit: optionalWholeNumber(0, MAX_DEPOSIT_RUPEES, errors.amount),
  furnishing: z.enum(FURNISHINGS, { error: errors.choose }),
  availableFrom: isoDate,
  minStayMonths: optionalWholeNumber(0, 36, errors.whole),
  bedrooms: optionalWholeNumber(0, 20, errors.whole),
  bathrooms: optionalWholeNumber(0, 20, errors.whole),
  amenities: z.array(z.enum(AMENITY_KEYS)).max(30),
  foodPref: z.union([z.enum(FOOD_PREFS), z.literal("")]).transform((v) => (v === "" ? undefined : v)),
  tenantGenderPref: z.enum(TENANT_GENDER_PREFS, { error: errors.choose }),
};

export const listingCreateSchema = z.object(listingFields);
export const listingUpdateSchema = z.object({ listingId: z.uuid(), ...listingFields });

export type ListingFormInput = z.input<typeof listingCreateSchema>;
export type ListingFormValues = z.output<typeof listingCreateSchema>;

// Exact address. lat/lng are optional: without them the server falls back to the neighbourhood or city centre.
export const addressSchema = z.object({
  listingId: z.uuid(),
  addressLine: z.string().trim().min(5, errors.address).max(300, errors.tooLong(300)),
  landmark: optionalText(200),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
});

export type AddressFormInput = Pick<z.input<typeof addressSchema>, "addressLine" | "landmark">;

// Photos: '{listing_id}/{uuid}.jpg' in the listing-photos bucket.
export const photoAddSchema = z
  .object({
    listingId: z.uuid(),
    path: z.string().regex(/^[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,100}$/),
  })
  .refine((v) => v.path.startsWith(`${v.listingId}/`));

export const photoRemoveSchema = z.object({ listingId: z.uuid(), photoId: z.uuid() });
export const photoOrderSchema = z.object({ listingId: z.uuid(), photoIds: z.array(z.uuid()).min(1).max(10) });

export const listingIdSchema = z.object({ listingId: z.uuid() });
export const listingStatusSchema = z.object({
  listingId: z.uuid(),
  status: z.enum(["active", "paused", "rented"]),
});

export const contactRequestSchema = z.object({
  listingId: z.uuid(),
  intro: z.string().trim().min(1, errors.intro).max(1000, errors.intro),
});
export const contactRespondSchema = z.object({ requestId: z.uuid(), accept: z.boolean() });
export const contactWithdrawSchema = z.object({ requestId: z.uuid(), listingId: z.uuid() });

export type ContactRequestInput = z.input<typeof contactRequestSchema>;
