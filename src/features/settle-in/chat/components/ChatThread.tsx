"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { loadEarlierMessages, markConversationRead } from "../actions";
import { useConversationRealtime } from "../hooks/useConversationRealtime";
import { chatStrings as s } from "../strings";
import type { ChatMessage } from "../types";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";

type Props = {
  conversationId: string;
  viewerId: string;
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
  disabledReason: string | null;
};

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const known = new Set(current.map((m) => m.id));
  const added = incoming.filter((m) => !known.has(m.id));
  if (added.length === 0) return current;
  return [...current, ...added].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// The live message list and composer for one conversation.
export function ChatThread({ conversationId, viewerId, initialMessages, initialHasMore, disabledReason }: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingEarlier, startLoading] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageId = messages.at(-1)?.id;

  const markRead = useCallback(() => {
    void markConversationRead({ conversationId });
  }, [conversationId]);

  // Mark as read when the chat opens.
  useEffect(() => {
    markRead();
  }, [markRead]);

  // Keep the newest message in view (not when older pages are added at the top).
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lastMessageId]);

  useConversationRealtime(conversationId, (message) => {
    setMessages((current) => mergeMessages(current, [message]));
    if (message.senderId !== viewerId && document.visibilityState === "visible") markRead();
  });

  function loadEarlier() {
    const oldest = messages[0];
    if (!oldest) return;
    setLoadError(null);
    startLoading(async () => {
      const result = await loadEarlierMessages({ conversationId, before: oldest.createdAt });
      if (!result.ok) {
        setLoadError(result.error);
        return;
      }
      setMessages((current) => mergeMessages(current, result.data.messages));
      setHasMore(result.data.hasMore);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border bg-card p-3" role="log" aria-label={s.threadLabel} aria-live="polite">
        {hasMore && (
          <div className="mb-3 text-center">
            <Button variant="outline" size="sm" className="h-9" disabled={loadingEarlier} onClick={loadEarlier}>
              {loadingEarlier ? s.loadingEarlier : s.loadEarlier}
            </Button>
          </div>
        )}
        {loadError && (
          <p role="alert" className="mb-3 text-center text-sm text-destructive">
            {loadError}
          </p>
        )}
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{s.threadEmpty}</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isMine={message.senderId === viewerId}
                onDeleted={(id) => setMessages((current) => current.filter((m) => m.id !== id))}
              />
            ))}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>
      <MessageComposer
        conversationId={conversationId}
        disabledReason={disabledReason}
        onSent={(message) => setMessages((current) => mergeMessages(current, [message]))}
      />
    </div>
  );
}
