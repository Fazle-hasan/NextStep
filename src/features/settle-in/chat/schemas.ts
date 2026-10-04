import { z } from "zod";

import { chatStrings } from "./strings";

export const MESSAGE_MAX_LENGTH = 2000;
export const MESSAGE_PAGE_SIZE = 50;

const ATTACHMENT_FILE = /^[A-Za-z0-9._-]+$/;

// A message needs text, a photo, or both. The photo must sit in the conversation's own folder.
export const sendMessageSchema = z
  .object({
    conversationId: z.uuid(),
    body: z
      .string()
      .trim()
      .max(MESSAGE_MAX_LENGTH, chatStrings.errors.tooLong)
      .optional()
      .transform((value) => (value ? value : undefined)),
    attachmentPath: z.string().max(300).optional(),
  })
  .refine((value) => value.body !== undefined || value.attachmentPath !== undefined, {
    message: chatStrings.errors.empty_message,
  })
  .refine(
    (value) => {
      if (value.attachmentPath === undefined) return true;
      const [folder, file, ...rest] = value.attachmentPath.split("/");
      return rest.length === 0 && folder === value.conversationId && file !== undefined && ATTACHMENT_FILE.test(file);
    },
    { message: chatStrings.errors.invalid_attachment },
  );

export const conversationIdSchema = z.object({ conversationId: z.uuid() });
export const messageIdSchema = z.object({ messageId: z.uuid() });

export const loadEarlierSchema = z.object({
  conversationId: z.uuid(),
  before: z.iso.datetime({ offset: true }),
});

export type SendMessageInput = z.input<typeof sendMessageSchema>;
