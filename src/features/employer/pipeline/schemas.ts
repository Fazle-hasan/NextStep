import { z } from "zod";

import { pipelineStrings } from "./strings";

const { errors } = pipelineStrings;

// Stages an employer can move an applicant to ("applied" and "withdrawn" are set by the applicant).
export const EMPLOYER_STATUSES = ["shortlisted", "interview", "offer", "hired", "rejected"] as const;
export type EmployerStatus = (typeof EMPLOYER_STATUSES)[number];

export const SLOT_DURATIONS = [30, 45, 60, 90] as const;

const id = z.uuid({ error: errors.invalidInput });

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((value) => (value ? value : undefined));

export const moveApplicantSchema = z.object({
  applicationId: id,
  status: z.enum(EMPLOYER_STATUSES, { error: errors.invalid_status }),
  note: optionalText(2000, errors.noteTooLong),
});

export const addNoteSchema = z.object({
  applicationId: id,
  body: z.string().trim().min(1, errors.noteEmpty).max(2000, errors.noteTooLong),
});

export const deleteNoteSchema = z.object({ noteId: id });

export const proposeSlotSchema = z.object({
  applicationId: id,
  // ISO timestamp built in the browser from the local date and time.
  startsAt: z
    .string()
    .refine((value) => !Number.isNaN(Date.parse(value)), errors.slotDateTime)
    .refine((value) => Date.parse(value) > Date.now(), errors.slot_in_past),
  durationMinutes: z.union(
    SLOT_DURATIONS.map((n) => z.literal(n)),
    { error: errors.invalidInput },
  ),
  locationOrLink: optionalText(300, errors.locationTooLong),
});

export const cancelSlotSchema = z.object({ slotId: id });

export const cvRequestSchema = z.object({ applicationId: id });

export type MoveApplicantInput = z.input<typeof moveApplicantSchema>;
export type ProposeSlotInput = z.input<typeof proposeSlotSchema>;
