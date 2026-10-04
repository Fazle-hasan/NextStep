import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { BlockButton } from "@/features/safety/components/BlockButton";
import { ReportDialog } from "@/features/safety/components/ReportDialog";

import { chatStrings as s, contextLabels } from "../strings";
import type { ConversationDetail } from "../types";

// Who the chat is with, plus block and report. Never shows a phone number or email.
export function ChatHeader({ conversation }: { conversation: ConversationDetail }) {
  const { other } = conversation;

  return (
    <header className="space-y-1">
      <Link
        href="/messages"
        className="inline-flex min-h-9 items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        {s.back}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-xl font-semibold tracking-tight">{other?.name ?? s.unavailableUser}</h1>
          <Badge variant="outline" className="shrink-0">
            {contextLabels[conversation.contextType]}
          </Badge>
        </div>
        {other && (
          <div className="flex items-center gap-1">
            <BlockButton userId={other.id} isBlocked={conversation.blockedByMe} />
            <ReportDialog targetType="user" targetId={other.id} triggerLabel={s.reportUser} />
          </div>
        )}
      </div>
    </header>
  );
}
