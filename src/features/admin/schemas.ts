import { z } from "zod";

import { adminStrings } from "./strings";

const reason = z.string().trim().max(1000).optional();

// Rejecting needs a reason; approving does not.
export const reviewSchema = z
  .object({ id: z.uuid(), approve: z.boolean(), reason })
  .refine((v) => v.approve || (v.reason?.length ?? 0) >= 5, { message: adminStrings.reasonRequired, path: ["reason"] });

export const jobReviewSchema = z.object({ id: z.uuid(), approve: z.boolean(), reason });
