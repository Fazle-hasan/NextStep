import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireViewer } from "@/features/auth/queries";
import { ChatHeader } from "@/features/settle-in/chat/components/ChatHeader";
import { ChatThread } from "@/features/settle-in/chat/components/ChatThread";
import { getConversation } from "@/features/settle-in/chat/queries";
import { chatStrings as s } from "@/features/settle-in/chat/strings";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const viewer = await requireViewer(`/messages/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();

  // RLS: only participants can see a conversation; everyone else gets a 404.
  const conversation = await getConversation(id, viewer.id);
  if (!conversation) notFound();

  const disabledReason = conversation.blockedByMe ? s.blockedByMe : conversation.blocked ? s.blocked : null;

  return (
    // Fills the screen between the top bar and the bottom tabs so the composer stays in view.
    <div className="mx-auto flex h-[calc(100dvh-11rem)] w-full max-w-2xl flex-col gap-3 md:h-[calc(100dvh-7.5rem)]">
      <ChatHeader conversation={conversation} />
      <ChatThread
        key={conversation.id}
        conversationId={conversation.id}
        viewerId={viewer.id}
        initialMessages={conversation.messages}
        initialHasMore={conversation.hasMore}
        disabledReason={disabledReason}
      />
    </div>
  );
}
