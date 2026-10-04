"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useEffectEvent } from "react";

import { createClient } from "@/lib/supabase/client";

import { toChatMessage, type MessageRow } from "../mappers";
import type { ChatMessage } from "../types";

// Live inserts for one conversation. The subscription is filtered by conversation_id and RLS on
// public.messages decides who receives rows, so only participants get anything.
export function useConversationRealtime(conversationId: string, onMessage: (message: ChatMessage) => void) {
  const handleMessage = useEffectEvent(onMessage);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    // Make sure the realtime socket carries the user's session token before subscribing.
    void supabase.realtime.setAuth().then(() => {
      if (cancelled) return;
      channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
          (payload) => handleMessage(toChatMessage(payload.new as MessageRow)),
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [conversationId]);
}
