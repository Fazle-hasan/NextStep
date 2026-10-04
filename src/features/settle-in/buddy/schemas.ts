import { z } from "zod";

import { RELOCATION_NEEDS } from "../relocation/schemas";

import { buddyStrings } from "./strings";

const e = buddyStrings.errors;

// "Urdu, Hindi ,English" -> ["Urdu", "Hindi", "English"] (blank entries and duplicates dropped).
export function parseLanguages(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => {
      const key = part.toLowerCase();
      if (!part || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// The form's raw values. The same schema runs in the browser and in the server action.
export const buddyProfileSchema = z.object({
  cityId: z.uuid({ error: e.city }),
  neighbourhoodIds: z.array(z.uuid()).max(20),
  bio: z.string().trim().max(1000, e.bio),
  languages: z
    .string()
    .max(300, e.languages)
    .refine((value) => parseLanguages(value).length <= 10, e.languages),
  helpTypes: z.array(z.enum(RELOCATION_NEEDS)).min(1, e.helpTypes).max(RELOCATION_NEEDS.length),
  isActive: z.boolean(),
});

export type BuddyProfileValues = z.infer<typeof buddyProfileSchema>;

export function toBuddyRow(v: BuddyProfileValues) {
  return {
    city_id: v.cityId,
    neighbourhood_ids: v.neighbourhoodIds,
    bio: v.bio || null,
    languages: parseLanguages(v.languages),
    help_types: v.helpTypes,
    is_active: v.isActive,
  };
}

export const offerHelpSchema = z.object({
  requestId: z.uuid(),
  message: z.string().trim().max(1000, e.message),
});

export const withdrawOfferSchema = z.object({ offerId: z.uuid() });

export const reverifySchema = z.object({ note: z.string().trim().max(1000, e.note) });
