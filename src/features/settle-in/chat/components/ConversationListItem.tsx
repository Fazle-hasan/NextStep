import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";

import { chatStrings as s, contextLabels } from "../strings";
import type { ConversationSummary } from "../types";

function preview(conversation: ConversationSummary): string {
  if (!conversation.lastMessageAt) return s.noMessagesYet;
  const text = conversation.lastMessageBody?.trim() || (conversation.lastMessageHasAttachment ? s.photo : s.noMessagesYet);
  return conversation.lastMessageIsMine ? `${s.you}: ${text}` : text;
}

export function ConversationListItem({ conversation }: { conversation: ConversationSummary }) {
  const unread = conversation.unreadCount > 0;

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className="block rounded-xl border bg-card p-3 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className={cn("truncate text-base leading-snug", unread ? "font-semibold" : "font-medium")}>
            {conversation.otherName ?? s.unavailableUser}
          </h2>
          <p className="text-xs text-muted-foreground">{contextLabels[conversation.contextType]}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {conversation.lastMessageAt && (
            <span className="text-xs text-muted-foreground">{timeAgo(conversation.lastMessageAt)}</span>
          )}
          {unread && (
            <Badge aria-label={s.unread(conversation.unreadCount)}>{conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}</Badge>
          )}
        </div>
      </div>
      <p className={cn("mt-1 truncate text-sm", unread ? "text-foreground" : "text-muted-foreground")}>{preview(conversation)}</p>
    </Link>
  );
}
