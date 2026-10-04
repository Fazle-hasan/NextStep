import { z } from "zod";

import { Constants } from "@/types/database";

export const REPORT_TARGET_TYPES = Constants.public.Enums.report_target_type;
export const REPORT_REASONS = Constants.public.Enums.report_reason;

export const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(2000).optional(),
});

export const blockSchema = z.object({ userId: z.uuid() });

export type ReportInput = z.input<typeof reportSchema>;
export type ReportValues = z.output<typeof reportSchema>;
