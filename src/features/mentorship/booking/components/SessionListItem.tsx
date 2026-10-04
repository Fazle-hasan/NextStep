import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { SESSION_TYPE_LABELS } from "../../labels";
import { bookingStrings as s } from "../strings";
import type { SessionSummary } from "../types";
import { LocalSessionTime } from "./LocalSessionTime";
import { SessionStatusBadge } from "./SessionStatusBadge";

// One of the mentee's sessions; the whole card opens the session.
export function SessionListItem({ session }: { session: SessionSummary }) {
  return (
    <Link
      href={`/sessions/${session.id}`}
      className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Card className="transition-colors hover:bg-muted/50">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
            <span>{SESSION_TYPE_LABELS[session.sessionType]}</span>
            <SessionStatusBadge status={session.status} startsAt={session.startsAt} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="break-words">{s.sessions.with(session.mentorName ?? s.mentor.unnamed)}</p>
          <p className="min-h-5 text-muted-foreground">
            <LocalSessionTime startsAt={session.startsAt} endsAt={session.endsAt} />
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
