import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BlockButton } from "@/features/safety/components/BlockButton";
import { ReportDialog } from "@/features/safety/components/ReportDialog";
import type { Enums } from "@/types/database";

import { relocationStrings } from "../strings";
import type { RequestOffer } from "../types";

import { OfferActions } from "./OfferActions";
import { RateBuddyForm } from "./RateBuddyForm";
import { OfferStatusBadge } from "./RequestStatusBadge";

const s = relocationStrings.detail;

type Props = {
  requestId: string;
  requestStatus: Enums<"request_status">;
  offer: RequestOffer;
};

// One buddy's offer on my request: who they are, their message, and what I can do next.
export function OfferCard({ requestId, requestStatus, offer }: Props) {
  const ratingText =
    offer.ratingAvg !== null && offer.ratingCount > 0 ? s.rating(offer.ratingAvg.toFixed(1), offer.ratingCount) : s.noRating;

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold">{offer.buddyName}</h3>
            <p className="text-sm text-muted-foreground">{ratingText}</p>
          </div>
          <OfferStatusBadge status={offer.status} />
        </div>
        {offer.bio && <p className="text-sm whitespace-pre-line text-muted-foreground">{offer.bio}</p>}
        {offer.languages.length > 0 && <p className="text-sm text-muted-foreground">{s.speaks(offer.languages.join(", "))}</p>}
        {offer.message && <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-line">{offer.message}</p>}

        {offer.status === "pending" && requestStatus === "open" && <OfferActions offerId={offer.id} />}
        {offer.status === "accepted" && offer.conversationId && (
          <Button asChild variant="outline" className="h-11">
            <Link href={`/messages/${offer.conversationId}`}>{s.openChat}</Link>
          </Button>
        )}
        {offer.status === "accepted" && requestStatus === "closed" && !offer.myRating && (
          <RateBuddyForm requestId={requestId} buddyId={offer.buddyId} />
        )}
        {offer.myRating && (
          <p className="text-sm">
            <span className="font-medium">{s.yourRating(offer.myRating.rating)}</span>
            {offer.myRating.comment && <span className="text-muted-foreground"> — {offer.myRating.comment}</span>}
          </p>
        )}

        <div className="flex flex-wrap gap-1 border-t pt-2">
          <ReportDialog targetType="user" targetId={offer.buddyId} />
          <BlockButton userId={offer.buddyId} />
        </div>
      </CardContent>
    </Card>
  );
}
