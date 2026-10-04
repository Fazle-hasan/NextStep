import type { Enums } from "@/types/database";

export type ConversationContext = Enums<"conversation_context">;

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string | null;
  body: string | null;
  attachmentPath: string | null;
  createdAt: string;
};

export type ConversationSummary = {
  id: string;
  contextType: ConversationContext;
  otherUserId: string | null;
  otherName: string | null;
  lastMessageAt: string | null;
  lastMessageBody: string | null;
  lastMessageHasAttachment: boolean;
  lastMessageIsMine: boolean;
  unreadCount: number;
};

export type ConversationDetail = {
  id: string;
  contextType: ConversationContext;
  other: { id: string; name: string | null } | null;
  // The viewer blocked the other person (they can unblock).
  blockedByMe: boolean;
  // A block exists either way, so nobody can send.
  blocked: boolean;
  messages: ChatMessage[];
  hasMore: boolean;
};

export type MessagePage = { messages: ChatMessage[]; hasMore: boolean };
