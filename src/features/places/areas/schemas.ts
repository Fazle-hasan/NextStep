import { z } from "zod";

import { Constants } from "@/types/database";

import { areaStrings } from "./strings";
import type { ListingType, RentRange } from "./types";

const { errors } = areaStrings;

export const TIP_MIN = 5;
export const TIP_MAX = 500;

export const slugSchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(100);

export const tipSchema = z.object({
  neighbourhoodId: z.uuid({ error: errors.invalid }),
  body: z.string().trim().min(TIP_MIN, { error: errors.tipLength }).max(TIP_MAX, { error: errors.tipLength }),
});

export const voteSchema = z.object({
  tipId: z.uuid({ error: errors.invalid }),
  // True adds the viewer's upvote, false removes it.
  upvote: z.boolean(),
});

export const tipIdSchema = z.object({ tipId: z.uuid({ error: errors.invalid }) });

export type TipInput = z.input<typeof tipSchema>;

const amount = z.number().int().min(0).max(2_000_000_000);
const rangeSchema = z.object({ min: amount.nullish(), max: amount.nullish() });

const LISTING_TYPES: readonly ListingType[] = Constants.public.Enums.listing_type;

// area_guides.rent_ranges is {listing_type: {min, max}} in monthly paise. Anything malformed is dropped.
export function parseRentRanges(value: unknown): RentRange[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const record = value as Record<string, unknown>;
  const ranges: RentRange[] = [];
  for (const type of LISTING_TYPES) {
    const parsed = rangeSchema.safeParse(record[type]);
    if (!parsed.success) continue;
    const min = parsed.data.min ?? null;
    const max = parsed.data.max ?? null;
    if (min === null && max === null) continue;
    if (min !== null && max !== null && max < min) continue;
    ranges.push({ type, min, max });
  }
  return ranges;
}
