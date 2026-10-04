"use client";

import { Trash2Icon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ReportDialog } from "@/features/safety/components/ReportDialog";
import { cn } from "@/lib/utils";

import { deleteMessage } from "../actions";
import { chatStrings as s } from "../strings";
import type { ChatMessage } from "../types";
import { AttachmentImage } from "./AttachmentImage";
import { LocalTime } from "./LocalTime";

type Props = {
  message: ChatMessage;
  isMine: boolean;
  onDeleted: (messageId: string) => void;
};

export function MessageBubble({ message, isMine, onDeleted }: Props) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(s.deleteConfirm)) return;
    startTransition(async () => {
      const result = await deleteMessage({ messageId: message.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(s.deleted);
      onDeleted(message.id);
    });
  }

  return (
    <li className={cn("flex flex-col gap-1", isMine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[85%] space-y-2 rounded-2xl px-3 py-2 text-sm sm:max-w-[70%]",
          isMine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        {message.attachmentPath && <AttachmentImage messageId={message.id} />}
        {/* Plain text only: rendered as text, line breaks kept. */}
        {message.body && <p className="break-words whitespace-pre-wrap">{message.body}</p>}
      </div>
      <div className={cn("flex items-center gap-1 text-xs text-muted-foreground", isMine && "flex-row-reverse")}>
        <LocalTime value={message.createdAt} />
        {isMine ? (
          <Button variant="ghost" size="icon-sm" disabled={pending} onClick={handleDelete} aria-label={s.removeMessage}>
            <Trash2Icon aria-hidden="true" />
          </Button>
        ) : (
          <ReportDialog targetType="message" targetId={message.id} triggerLabel={s.reportMessage} />
        )}
      </div>
    </li>
  );
}
