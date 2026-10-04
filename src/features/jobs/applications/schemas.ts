import { z } from "zod";

import { applyStrings, referralsStrings } from "./strings";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value ? value : undefined));

// Answers keyed by screening question id. Blank answers are dropped; the database checks required ones.
const answersSchema = z
  .record(z.uuid(), z.string().trim().max(1000, applyStrings.errors.answerTooLong))
  .default({})
  .transform((answers) => Object.fromEntries(Object.entries(answers).filter(([, answer]) => answer !== "")));

export const applySchema = z.object({
  jobId: z.uuid(),
  cvId: z.uuid({ error: applyStrings.errors.cv }),
  coverNote: optionalText(2000, applyStrings.errors.coverNote),
  answers: answersSchema,
  referralId: z.uuid().optional(),
});

export type ApplyInput = z.input<typeof applySchema>;
export type ApplyValues = z.output<typeof applySchema>;

export const slotSchema = z.object({ slotId: z.uuid() });
export const applicationIdSchema = z.object({ applicationId: z.uuid() });

// Either a verified company from the list or the name of an organisation that is not on NextStep yet (D-046).
export const addAffiliationSchema = z.union([
  z.object({ companyId: z.uuid({ error: referralsStrings.errors.companyUnavailable }) }),
  z.object({
    organisationName: z
      .string()
      .trim()
      .min(2, referralsStrings.errors.organisationName)
      .max(120, referralsStrings.errors.organisationName),
  }),
]);
export const affiliationIdSchema = z.object({ affiliationId: z.uuid() });

export const createReferralSchema = z.object({
  jobId: z.uuid(),
  note: optionalText(500, referralsStrings.errors.note),
});
export const referralIdSchema = z.object({ referralId: z.uuid() });

// `?ref=` from a referral link. Anything that is not a UUID is ignored.
export function parseReferralParam(value: string | string[] | undefined): string | undefined {
  const parsed = z.uuid().safeParse(Array.isArray(value) ? value[0] : value);
  return parsed.success ? parsed.data : undefined;
}

// Only http(s) links are rendered as links; anything else is shown as plain text.
export function isHttpUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}
