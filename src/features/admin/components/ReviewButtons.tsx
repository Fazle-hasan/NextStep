"use client";

import { useId, useState, useTransition } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/result";

import { adminStrings as s } from "../strings";

type Props = {
  id: string;
  subject: string;
  // Server action that performs the review.
  action: (input: { id: string; approve: boolean; reason?: string }) => Promise<ActionResult>;
  rejectLabel?: string;
  reasonRequired?: boolean;
};

// Approve directly, or reject through a dialog that collects a reason.
export function ReviewButtons({ id, subject, action, rejectLabel = s.reject, reasonRequired = true }: Props) {
  const reasonId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(approve: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await action({ id, approve, reason: approve ? undefined : reason });
      if (!result.ok) {
        if (approve) toast.error(result.error);
        else setError(result.error);
        return;
      }
      setOpen(false);
      toast.success(s.done);
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button className="h-11" disabled={pending} onClick={() => submit(true)}>
        {pending ? s.working : s.approve}
      </Button>
      <Button variant="outline" className="h-11" disabled={pending} onClick={() => setOpen(true)}>
        {rejectLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rejectLabel}</DialogTitle>
            <DialogDescription>{subject}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={reasonId}>{reasonRequired ? s.reasonLabel : s.reasonOptional}</Label>
            <Textarea
              id={reasonId}
              value={reason}
              maxLength={1000}
              rows={4}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={Boolean(error)}
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button className="h-11" disabled={pending} onClick={() => submit(false)}>
              {pending ? s.working : s.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
