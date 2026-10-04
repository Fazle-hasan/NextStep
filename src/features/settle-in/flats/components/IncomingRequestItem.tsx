"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { timeAgo } from "@/lib/utils/dates";

import { respondContactRequest } from "../actions";
import { flatsStrings } from "../strings";
import type { IncomingRequest } from "../types";

const s = flatsStrings.manage;

// One contact request on the lister's own listing: accept (opens a chat and shares the address) or decline.
export function IncomingRequestItem({ request }: { request: IncomingRequest }) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState(request.conversationId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function respond(accept: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await respondContactRequest({ requestId: request.id, accept });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.data.conversationId) setConversationId(result.data.conversationId);
      toast.success(accept ? s.acceptedToast : s.declinedToast);
      router.refresh();
    });
  }

  return (
    <li className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{request.requesterName ?? s.someone}</p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant={request.status === "accepted" ? "default" : "secondary"}>
            {flatsStrings.requestStatus[request.status]}
          </Badge>
          <span>{timeAgo(request.createdAt)}</span>
        </div>
      </div>
      <p className="text-sm break-words whitespace-pre-line">{request.intro}</p>

      {request.status === "pending" && (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-11" disabled={pending} onClick={() => respond(true)}>
              {s.accept}
            </Button>
            <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={() => respond(false)}>
              {s.decline}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{s.acceptHint}</p>
        </div>
      )}
      {request.status === "accepted" && conversationId && (
        <Button asChild variant="outline" className="h-11">
          <Link href={`/messages/${conversationId}`}>{s.openChat}</Link>
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}
