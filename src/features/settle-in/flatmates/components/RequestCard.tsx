import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BlockButton } from "@/features/safety/components/BlockButton";
import { ReportDialog } from "@/features/safety/components/ReportDialog";
import { timeAgo } from "@/lib/utils/dates";

import { flatmateStrings as s } from "../strings";
import type { ConnectionRequest } from "../types";

import { RespondButtons } from "./RespondButtons";
import { WithdrawButton } from "./WithdrawButton";

type Props = { request: ConnectionRequest; direction: "incoming" | "sent" };

// One connect request, received or sent, with the actions that still apply.
export function RequestCard({ request, direction }: Props) {
  const name = request.otherName ?? s.matches.unnamed;
  const r = s.requests;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <h3 className="min-w-0 break-words">{direction === "incoming" ? r.from(name) : r.to(name)}</h3>
          <Badge variant={request.status === "pending" ? "default" : "secondary"}>{r.status[request.status]}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{timeAgo(request.createdAt)}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className={request.message ? "text-sm break-words whitespace-pre-line" : "text-sm text-muted-foreground"}>
          {request.message ?? r.noMessage}
        </p>

        {request.status === "pending" && direction === "incoming" && <RespondButtons connectionId={request.id} />}
        {request.status === "pending" && direction === "sent" && <WithdrawButton connectionId={request.id} />}
        {request.status === "accepted" && request.conversationId && (
          <Button asChild variant="outline" className="h-11">
            <Link href={`/messages/${request.conversationId}`}>{s.connect.openChat}</Link>
          </Button>
        )}

        {direction === "incoming" && (
          <div className="flex flex-wrap items-center gap-2">
            <ReportDialog targetType="user" targetId={request.otherUserId} />
            <BlockButton userId={request.otherUserId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
