"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Enums } from "@/types/database";

import { requestBuddyVerification } from "../actions";
import { buddyStrings } from "../strings";

const s = buddyStrings.verification;

type Props = {
  status: Enums<"verification_status">;
  rejectionReason: string | null;
  isActive: boolean;
};

// Shows where the buddy stands with verification; after a rejection they can ask for another review.
export function VerificationBanner({ status, rejectionReason, isActive }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reRequest(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestBuddyVerification({ note });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.sent);
      router.refresh();
    });
  }

  if (status === "pending") {
    return (
      <Alert>
        <AlertTitle>{s.pendingTitle}</AlertTitle>
        <AlertDescription>{s.pendingBody}</AlertDescription>
      </Alert>
    );
  }

  if (status === "approved") {
    return (
      <Alert>
        <AlertTitle>{s.approvedTitle}</AlertTitle>
        <AlertDescription>{isActive ? s.approvedBody : s.paused}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>{s.rejectedTitle}</AlertTitle>
      <AlertDescription>
        {rejectionReason && <p>{s.rejectedReason(rejectionReason)}</p>}
        <form onSubmit={reRequest} className="mt-3 w-full space-y-3 text-foreground">
          <div className="space-y-2">
            <Label htmlFor="reverify-note">{s.noteLabel}</Label>
            <Textarea id="reverify-note" rows={3} maxLength={1000} className="text-base" value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="h-11" disabled={pending}>
            {pending ? s.sending : s.reRequest}
          </Button>
        </form>
      </AlertDescription>
    </Alert>
  );
}
