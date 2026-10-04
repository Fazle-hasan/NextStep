"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { OfferStatusBadge } from "../../relocation/components/RequestStatusBadge";
import { withdrawOffer } from "../actions";
import { buddyStrings } from "../strings";
import type { MyOffer } from "../types";

const s = buddyStrings.offers;

// One of the buddy's offers: status, chat link once accepted, withdraw while pending.
export function MyOfferItem({ offer }: { offer: MyOffer }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function withdraw() {
    setError(null);
    startTransition(async () => {
      const result = await withdrawOffer({ offerId: offer.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.withdrawn);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-base leading-snug font-semibold">{s.to(offer.requesterFirstName, offer.cityName)}</h3>
          <OfferStatusBadge status={offer.status} />
        </div>
        {offer.message && <p className="text-sm whitespace-pre-line text-muted-foreground">{offer.message}</p>}
        {offer.requestStatus && offer.requestStatus !== "open" && <p className="text-sm text-muted-foreground">{s.requestClosed}</p>}
        {offer.status === "accepted" && offer.conversationId && (
          <Button asChild variant="outline" className="h-11">
            <Link href={`/messages/${offer.conversationId}`}>{s.openChat}</Link>
          </Button>
        )}
        {offer.status === "pending" && (
          <Button variant="outline" className="h-11" onClick={withdraw} disabled={pending}>
            {pending ? s.withdrawing : s.withdraw}
          </Button>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
