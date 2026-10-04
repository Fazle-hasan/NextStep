"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { respondToOffer } from "../actions";
import { relocationStrings } from "../strings";

const s = relocationStrings.detail;

// Accept or decline a buddy's offer. Accepting opens the chat.
export function OfferActions({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function respond(accept: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await respondToOffer({ offerId, accept });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(accept ? s.accepted : s.declined);
      if (accept && result.data.conversationId) {
        router.push(`/messages/${result.data.conversationId}`);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button className="h-11" onClick={() => respond(true)} disabled={pending}>
          {pending ? s.working : s.accept}
        </Button>
        <Button variant="outline" className="h-11" onClick={() => respond(false)} disabled={pending}>
          {s.decline}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
