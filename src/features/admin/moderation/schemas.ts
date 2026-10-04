import { z } from "zod";

import { moderationStrings } from "./strings";

export const REPORT_ACTIONS = ["dismiss", "hide", "warn", "suspend"] as const;
export type ReportAction = (typeof REPORT_ACTIONS)[number];

// Warning and suspending need a note (the warning text, or the reason kept in the audit log).
export const resolveReportSchema = z
  .object({
    reportId: z.uuid(),
    action: z.enum(REPORT_ACTIONS),
    note: z.string().trim().max(1000, moderationStrings.errors.note_too_long).optional(),
  })
  .refine((v) => (v.action !== "warn" && v.action !== "suspend") || (v.note?.length ?? 0) >= 5, {
    message: moderationStrings.noteRequired,
    path: ["note"],
  });

export const moderationTabSchema = z.enum(["open", "resolved"]).catch("open");
