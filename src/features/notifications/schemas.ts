import { z } from "zod";

import { NOTIFICATION_TYPES } from "./labels";

export const NOTIFICATION_PAGE_SIZE = 30;

// Omitted ids = mark everything as read.
export const markReadSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(100).optional(),
});

export const notificationIdSchema = z.object({ id: z.uuid() });

export const loadMoreSchema = z.object({ before: z.iso.datetime({ offset: true }) });

export const preferencesSchema = z.object({
  emailEnabled: z.boolean(),
  mutedTypes: z
    .array(z.enum(NOTIFICATION_TYPES))
    .max(NOTIFICATION_TYPES.length)
    .transform((types) => [...new Set(types)]),
  whatsappOptIn: z.boolean(),
});

export type PreferencesInput = z.input<typeof preferencesSchema>;

// A notification may only link inside the app. Anything else (absolute URLs, "//host") is dropped.
export function safeNotificationLink(link: string | null | undefined): string | null {
  if (!link || !link.startsWith("/") || link.startsWith("//") || link.includes("\\")) return null;
  return link;
}
