import { z } from "zod";

import { normalizeIndianPhone } from "@/lib/validation/phone";
import { Constants } from "@/types/database";

import { onboardingStrings } from "./strings";

const { errors } = onboardingStrings;

export const INTENTS = Constants.public.Enums.onboarding_intent;
export const GENDERS = Constants.public.Enums.gender;

// Empty means "keep the phone already on the account".
const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (!value) return undefined;
    const phone = normalizeIndianPhone(value);
    if (!phone) {
      ctx.addIssue({ code: "custom", message: errors.invalid_phone });
      return z.NEVER;
    }
    return phone;
  });

export const onboardingSchema = z.object({
  fullName: z.string().trim().min(1, errors.fullName).max(120, errors.fullName),
  gender: z.enum(GENDERS, { error: errors.gender }),
  cityId: z.uuid({ error: errors.city }),
  phone: optionalPhone,
  intents: z.array(z.enum(INTENTS)).min(1, errors.intents),
  verificationNote: z.string().trim().max(1000).optional(),
});

export type OnboardingInput = z.input<typeof onboardingSchema>;
export type OnboardingValues = z.output<typeof onboardingSchema>;
