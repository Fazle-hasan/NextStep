import { z } from "zod";

import { usersStrings } from "./strings";

// Suspending needs a reason; lifting a suspension does not.
export const suspensionSchema = z
  .object({
    userId: z.uuid(),
    suspend: z.boolean(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((v) => !v.suspend || (v.reason?.length ?? 0) >= 5, { message: usersStrings.reasonRequired, path: ["reason"] });

function first(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

export const userSearchSchema = z.object({
  q: z.preprocess((v) => (typeof first(v) === "string" ? first(v) : ""), z.string().trim().max(80)),
  suspended: z.preprocess((v) => first(v) === "1" || first(v) === "on", z.boolean()),
});

export type UserSearch = z.output<typeof userSearchSchema>;

// Escapes the characters that have a meaning in a LIKE pattern.
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
