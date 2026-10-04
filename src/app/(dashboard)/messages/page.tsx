import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { ConversationListItem } from "@/features/settle-in/chat/components/ConversationListItem";
import { getMyConversations } from "@/features/settle-in/chat/queries";
import { chatStrings as s } from "@/features/settle-in/chat/strings";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const viewer = await requireViewer("/messages");
  const conversations = await getMyConversations(viewer.id);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 text-center">
            <h2 className="text-base font-semibold">{s.emptyTitle}</h2>
            <p className="text-sm text-muted-foreground">{s.emptyBody}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline" className="h-11">
                <Link href="/settle-in">{s.emptyLinks.settleIn}</Link>
              </Button>
              <Button asChild variant="outline" className="h-11">
                <Link href="/flats">{s.emptyLinks.flats}</Link>
              </Button>
              <Button asChild variant="outline" className="h-11">
                <Link href="/flatmates">{s.emptyLinks.flatmates}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <ConversationListItem conversation={conversation} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
