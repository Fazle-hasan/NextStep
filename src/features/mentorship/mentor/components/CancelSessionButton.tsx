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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { cancelSessionAsMentor } from "../actions";
import { mentorStrings } from "../strings";

const s = mentorStrings.detail;

// The mentor cancels a requested or confirmed session before it starts.
export function CancelSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await cancelSessionAsMentor({ sessionId, reason });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.cancelled);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11">
          {s.cancelSession}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{s.cancelTitle}</DialogTitle>
          <DialogDescription>{s.cancelBody}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">{s.cancelReasonLabel}</Label>
          <Textarea id="cancel-reason" rows={3} maxLength={500} className="text-base" value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={() => setOpen(false)} disabled={pending}>
            {s.keep}
          </Button>
          <Button variant="destructive" className="h-11" onClick={submit} disabled={pending}>
            {pending ? s.working : s.confirmCancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
