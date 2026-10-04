// Shared by server queries and the browser realtime hook (no server-only imports here).
import type { ChatMessage } from "./types";

export const MESSAGE_COLUMNS = "id, conversation_id, sender_id, body, attachment_path, created_at";

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string | null;
  attachment_path: string | null;
  created_at: string;
};

export function toChatMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    attachmentPath: row.attachment_path,
    createdAt: row.created_at,
  };
}
