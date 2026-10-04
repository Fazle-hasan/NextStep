"use client";

import { Trash2Icon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { notificationStrings as s } from "../strings";
import type { NotificationItem } from "../types";

type Props = {
  item: NotificationItem;
  disabled: boolean;
  onOpen: (item: NotificationItem) => void;
  onDelete: (item: NotificationItem) => void;
};

// One notification. The text links to its in-app page (when it has one) and marks itself read on click.
export function NotificationRow({ item, disabled, onOpen, onDelete }: Props) {
  const content = (
    <>
      <span className="flex items-start gap-2">
        {!item.read && (
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary">
            <span className="sr-only">{s.unread}</span>
          </span>
        )}
        <span className={cn("font-medium", item.read && "text-muted-foreground")}>{item.title}</span>
      </span>
      {item.body && <span className="block text-sm whitespace-pre-line text-muted-foreground">{item.body}</span>}
      <span className="block text-xs text-muted-foreground">{item.timeLabel}</span>
    </>
  );
  const textClass = "block min-w-0 flex-1 space-y-1 rounded-lg p-3 text-left";

  return (
    <li className={cn("flex items-start gap-1 rounded-xl border", !item.read && "bg-muted/40")}>
      {item.link ? (
        <Link
          href={item.link}
          onClick={() => onOpen(item)}
          className={cn(textClass, "hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none")}
        >
          {content}
        </Link>
      ) : item.read ? (
        <div className={textClass}>{content}</div>
      ) : (
        <button
          type="button"
          onClick={() => onOpen(item)}
          className={cn(textClass, "hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none")}
        >
          {content}
        </button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="m-1 size-11 shrink-0 text-muted-foreground"
        aria-label={`${s.remove}: ${item.title}`}
        disabled={disabled}
        onClick={() => onDelete(item)}
      >
        <Trash2Icon className="size-4" aria-hidden="true" />
      </Button>
    </li>
  );
}
