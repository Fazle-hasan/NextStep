"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { BUCKETS, CHAT_SIGNED_URL_SECONDS } from "@/lib/supabase/storage";

import { MESSAGE_COLUMNS, toChatMessage } from "./mappers";
import { listMessages } from "./queries";
import { conversationIdSchema, loadEarlierSchema, messageIdSchema, sendMessageSchema } from "./schemas";
import { chatStrings } from "./strings";
import type { ChatMessage, MessagePage } from "./types";

const { errors } = chatStrings;
const INSUFFICIENT_PRIVILEGE = "42501";

async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

// RLS and the messages trigger re-check participation, blocks and the rate limit.
export async function sendMessage(input: unknown): Promise<ActionResult<ChatMessage>> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.signedOut);

  const { conversationId, body, attachmentPath } = parsed.data;
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: userId, body: body ?? null, attachment_path: attachmentPath ?? null })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error || !data) {
    // A row-level security refusal means the viewer is not in this conversation.
    if (error?.code === INSUFFICIENT_PRIVILEGE && error.message !== "not_sender") return fail(errors.not_participant);
    return fail(dbErrorMessage(error, errors, errors.generic));
  }

  revalidatePath("/messages");
  return ok(toChatMessage(data));
}

export async function deleteMessage(input: unknown): Promise<ActionResult> {
  const parsed = messageIdSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.signedOut);

  const { error } = await supabase.rpc("delete_message", { p_message_id: parsed.data.messageId });
  if (error) return fail(dbErrorMessage(error, errors, errors.generic));

  revalidatePath("/messages");
  return ok();
}

export async function markConversationRead(input: unknown): Promise<ActionResult> {
  const parsed = conversationIdSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.signedOut);

  const { error } = await supabase.rpc("mark_conversation_read", { p_conversation_id: parsed.data.conversationId });
  if (error) return fail(errors.generic);

  revalidatePath("/messages");
  return ok();
}

export async function loadEarlierMessages(input: unknown): Promise<ActionResult<MessagePage>> {
  const parsed = loadEarlierSchema.safeParse(input);
  if (!parsed.success) return fail(errors.load);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.signedOut);

  const page = await listMessages(supabase, parsed.data.conversationId, parsed.data.before);
  if (!page) return fail(errors.load);
  return ok(page);
}

// Short-lived link to a chat photo. Looked up through the message, so it only works for a message the
// viewer can read (RLS: participants only); storage RLS checks the conversation folder again.
export async function getAttachmentUrl(input: unknown): Promise<ActionResult<{ url: string }>> {
  const parsed = messageIdSchema.safeParse(input);
  if (!parsed.success) return fail(chatStrings.photoUnavailable);

  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.signedOut);

  const { data: message } = await supabase
    .from("messages")
    .select("attachment_path")
    .eq("id", parsed.data.messageId)
    .maybeSingle();
  if (!message?.attachment_path) return fail(chatStrings.photoUnavailable);

  const { data: signed, error } = await supabase.storage
    .from(BUCKETS.chatAttachments)
    .createSignedUrl(message.attachment_path, CHAT_SIGNED_URL_SECONDS);
  if (error || !signed?.signedUrl) return fail(chatStrings.photoUnavailable);

  return ok({ url: signed.signedUrl });
}
