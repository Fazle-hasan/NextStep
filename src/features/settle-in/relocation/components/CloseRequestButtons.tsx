"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { closeRelocationRequest } from "../actions";
import { relocationStrings } from "../strings";

const s = relocationStrings.detail;

// "I'm settled" (close) or cancel, each behind a confirmation.
export function CloseRequestButtons({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"settle" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    if (!mode) return;
    const cancel = mode === "cancel";
    setError(null);
    startTransition(async () => {
      const result = await closeRelocationRequest({ requestId, cancel });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(cancel ? s.cancelled : s.closed);
      setMode(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button className="h-11" onClick={() => setMode("settle")}>
          {s.settle}
        </Button>
        <Button variant="outline" className="h-11" onClick={() => setMode("cancel")}>
          {s.cancel}
        </Button>
      </div>
      <Dialog open={mode !== null} onOpenChange={(open) => !open && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === "cancel" ? s.confirmCancel : s.confirmSettle}</DialogTitle>
            <DialogDescription>{mode === "cancel" ? s.confirmCancelBody : s.confirmSettleBody}</DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setMode(null)} disabled={pending}>
              {s.keep}
            </Button>
            <Button variant={mode === "cancel" ? "destructive" : "default"} className="h-11" onClick={confirm} disabled={pending}>
              {pending ? s.working : mode === "cancel" ? s.cancel : s.settle}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
