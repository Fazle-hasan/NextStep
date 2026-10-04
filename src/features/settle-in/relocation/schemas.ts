import { z } from "zod";

import { rupeesToPaise } from "@/lib/utils/money";
import { Constants } from "@/types/database";

import { relocationStrings } from "./strings";

const e = relocationStrings.errors;

export const RELOCATION_NEEDS = Constants.public.Enums.relocation_need;
export const HOUSEHOLD_TYPES = Constants.public.Enums.household_type;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Whole rupees, up to ₹1 crore a month (the column is an integer in paise).
const RUPEES_RE = /^\d{0,8}$/;

// The form's raw values (strings from inputs). The same schema runs in the browser and in the server action.
export const requestFormSchema = z
  .object({
    cityId: z.uuid({ error: e.city }),
    neighbourhoodIds: z.array(z.uuid()).max(20),
    moveFrom: z.string().regex(DATE_RE, e.moveFrom),
    moveTo: z.string().refine((v) => v === "" || DATE_RE.test(v), e.moveTo),
    workplaceAddress: z.string().trim().max(300, e.workplaceAddress),
    // keep: leave the saved pin alone (edit only). set: use the coordinates below. clear: no pin.
    pinAction: z.enum(["keep", "set", "clear"]),
    workplaceLat: z.number().min(-90).max(90).nullable(),
    workplaceLng: z.number().min(-180).max(180).nullable(),
    budgetMin: z.string().trim().regex(RUPEES_RE, e.budget),
    budgetMax: z.string().trim().regex(RUPEES_RE, e.budget),
    // "" = nothing chosen yet (rejected below).
    household: z.enum([...HOUSEHOLD_TYPES, ""], { error: e.household }),
    needs: z.array(z.enum(RELOCATION_NEEDS)).min(1, e.needs).max(RELOCATION_NEEDS.length),
    note: z.string().trim().max(1000, e.note),
    sameGenderOnly: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.moveTo && DATE_RE.test(v.moveFrom) && v.moveTo < v.moveFrom) {
      ctx.addIssue({ code: "custom", path: ["moveTo"], message: e.moveTo });
    }
    if (v.budgetMin && v.budgetMax && Number(v.budgetMax) < Number(v.budgetMin)) {
      ctx.addIssue({ code: "custom", path: ["budgetMax"], message: e.budgetRange });
    }
    if (v.household === "") {
      ctx.addIssue({ code: "custom", path: ["household"], message: e.household });
    }
    if (v.pinAction === "set" && (v.workplaceLat === null || v.workplaceLng === null)) {
      ctx.addIssue({ code: "custom", path: ["workplaceAddress"], message: e.invalid });
    }
  });

export type RequestFormValues = z.infer<typeof requestFormSchema>;

export const updateRequestSchema = z.object({ requestId: z.uuid(), values: requestFormSchema });

// Columns for insert/update. The pin is only included when it changes.
export function toRequestRow(v: RequestFormValues) {
  if (v.household === "") throw new Error("household is required");
  const pin =
    v.pinAction === "set" && v.workplaceLat !== null && v.workplaceLng !== null
      ? { workplace_location: `SRID=4326;POINT(${v.workplaceLng} ${v.workplaceLat})` }
      : v.pinAction === "clear"
        ? { workplace_location: null }
        : {};
  return {
    city_id: v.cityId,
    neighbourhood_ids: v.neighbourhoodIds,
    move_from: v.moveFrom,
    move_to: v.moveTo || null,
    workplace_address: v.workplaceAddress || null,
    budget_min: v.budgetMin ? rupeesToPaise(Number(v.budgetMin)) : null,
    budget_max: v.budgetMax ? rupeesToPaise(Number(v.budgetMax)) : null,
    household: v.household,
    needs: v.needs,
    note: v.note || null,
    same_gender_buddies_only: v.sameGenderOnly,
    ...pin,
  };
}

export const respondOfferSchema = z.object({ offerId: z.uuid(), accept: z.boolean() });
export const closeRequestSchema = z.object({ requestId: z.uuid(), cancel: z.boolean() });

export const rateBuddySchema = z.object({
  requestId: z.uuid(),
  buddyId: z.uuid(),
  rating: z.coerce.number().int().min(1, e.rating_required).max(5, e.rating_required),
  comment: z.string().trim().max(1000, e.comment),
});
