import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BlockButton } from "@/features/safety/components/BlockButton";
import { ReportDialog } from "@/features/safety/components/ReportDialog";

import { GENDER_LABELS } from "../labels";
import { flatmateStrings as s } from "../strings";
import type { FlatmateMatch } from "../types";

import { ConnectButton } from "./ConnectButton";
import { ProfileFacts } from "./ProfileFacts";

type Props = { match: FlatmateMatch; areaNames: string[] };

// One compatible person in the match list.
export function MatchCard({ match, areaNames }: Props) {
  const name = match.fullName ?? s.matches.unnamed;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg">
          <h3 className="min-w-0 break-words">{name}</h3>
          <Badge>{s.matches.score(match.score)}</Badge>
        </CardTitle>
        {match.gender && <p className="text-sm text-muted-foreground">{GENDER_LABELS[match.gender]}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        <ProfileFacts
          budgetMin={match.budgetMin}
          budgetMax={match.budgetMax}
          moveDate={match.moveDate}
          areaNames={areaNames}
          foodHabit={match.foodHabit}
          smokes={match.smokes}
          sleepSchedule={match.sleepSchedule}
          workSchedule={match.workSchedule}
          cleanliness={match.cleanliness}
          guestsPolicy={match.guestsPolicy}
        />
        {match.bio && <p className="text-sm break-words whitespace-pre-line">{match.bio}</p>}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {match.connectionStatus === "accepted" ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary">{s.connect.connected}</Badge>
              {match.conversationId && (
                <Button asChild variant="outline" className="h-11">
                  <Link href={`/messages/${match.conversationId}`}>{s.connect.openChat}</Link>
                </Button>
              )}
            </div>
          ) : match.connectionStatus === "pending" ? (
            <Link href="/flatmates/requests" className="inline-flex min-h-11 items-center">
              <Badge variant="secondary">{s.connect.pending}</Badge>
            </Link>
          ) : (
            <ConnectButton recipientId={match.userId} recipientName={name} />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <ReportDialog targetType="user" targetId={match.userId} />
            <BlockButton userId={match.userId} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
