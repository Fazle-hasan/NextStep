import "server-only";

import { createClient } from "@/lib/supabase/server";

import { MESSAGE_COLUMNS, toChatMessage } from "./mappers";
import { MESSAGE_PAGE_SIZE } from "./schemas";
import type { ConversationDetail, ConversationSummary, MessagePage } from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// The viewer's conversations, newest first. RLS limits the RPC to conversations they take part in.
export async function getMyConversations(viewerId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_conversations");
  if (error) throw new Error("conversations_unavailable");

  return (data ?? []).map((row) => ({
    id: row.conversation_id,
    contextType: row.context_type,
    otherUserId: row.other_user_id,
    otherName: row.other_name,
    lastMessageAt: row.last_message_at,
    lastMessageBody: row.last_message_body,
    lastMessageHasAttachment: Boolean(row.last_message_has_attachment),
    lastMessageIsMine: row.last_message_sender_id === viewerId,
    unreadCount: row.unread_count ?? 0,
  }));
}

// Total unread messages across the viewer's conversations (for a badge in the app shell).
export async function getUnreadConversationCount(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_conversations");
  if (error) return 0;
  return (data ?? []).reduce((total, row) => total + (row.unread_count ?? 0), 0);
}

// One page of messages, oldest first. `before` pages back in time. Null when the read fails.
export async function listMessages(supabase: Supabase, conversationId: string, before?: string): Promise<MessagePage | null> {
  let query = supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE + 1);
  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) return null;

  const rows = data ?? [];
  return {
    messages: rows.slice(0, MESSAGE_PAGE_SIZE).reverse().map(toChatMessage),
    hasMore: rows.length > MESSAGE_PAGE_SIZE,
  };
}

// A conversation the viewer takes part in, or null (RLS hides everything else).
export async function getConversation(conversationId: string, viewerId: string): Promise<ConversationDetail | null> {
  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, context_type")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) return null;

  const { data: participants } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId);
  if (!participants?.some((p) => p.user_id === viewerId)) return null;
  const otherId = participants.find((p) => p.user_id !== viewerId)?.user_id ?? null;

  const [page, profile, myBlock, blocked] = await Promise.all([
    listMessages(supabase, conversationId),
    otherId ? supabase.from("profiles").select("full_name").eq("id", otherId).maybeSingle() : null,
    otherId ? supabase.from("blocks").select("id").eq("blocker_id", viewerId).eq("blocked_id", otherId).maybeSingle() : null,
    otherId ? supabase.rpc("is_blocked_between", { a: viewerId, b: otherId }) : null,
  ]);
  if (!page) throw new Error("messages_unavailable");

  return {
    id: conversation.id,
    contextType: conversation.context_type,
    other: otherId ? { id: otherId, name: profile?.data?.full_name ?? null } : null,
    blockedByMe: Boolean(myBlock?.data),
    blocked: Boolean(blocked?.data),
    messages: page.messages,
    hasMore: page.hasMore,
  };
}
