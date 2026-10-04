import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { SESSION_TYPE_LABELS, sessionStatusLabel } from "../../labels";
import { mentorStrings } from "../strings";
import type { MentorSession } from "../types";

import { RespondButtons } from "./RespondButtons";
import { SessionTime } from "./SessionTime";

const s = mentorStrings.sessions;

type Props = {
  session: MentorSession;
  // Requests show the goal note and the accept / decline buttons.
  variant: "request" | "upcoming" | "past";
};

// One session on the mentor dashboard.
export function SessionListItem({ session, variant }: Props) {
  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <h3 className="text-base leading-snug font-semibold">{s.with(session.menteeName)}</h3>
            <p className="text-sm text-muted-foreground">{SESSION_TYPE_LABELS[session.sessionType]}</p>
          </div>
          {variant !== "request" && (
            <Badge variant="secondary" className="shrink-0">
              {sessionStatusLabel({ status: session.status, starts_at: session.startsAt })}
            </Badge>
          )}
        </div>
        <SessionTime startsAt={session.startsAt} endsAt={session.endsAt} className="block min-h-5 text-sm" />
        {variant === "request" && (
          <div className="text-sm">
            <p className="font-medium">{s.goal}</p>
            <p className="break-words whitespace-pre-line text-muted-foreground">{session.goalNote ?? s.noGoal}</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {variant === "request" && <RespondButtons sessionId={session.id} />}
          {variant === "upcoming" && session.meetingUrl && (
            <Button asChild className="h-11">
              <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer">
                {s.join}
              </a>
            </Button>
          )}
          <Button asChild variant="outline" className="h-11">
            <Link href={`/mentor/sessions/${session.id}`}>{s.open}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
