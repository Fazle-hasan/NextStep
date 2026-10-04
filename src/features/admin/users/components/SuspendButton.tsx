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

import { setUserSuspension } from "../actions";
import { usersStrings as s } from "../strings";

type Props = { userId: string; name: string; suspended: boolean };

// Suspend (with a reason) or lift a suspension, each behind a confirm dialog.
export function SuspendButton({ userId, name, suspended }: Props) {
  const reasonId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const suspend = !suspended;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await setUserSuspension({ userId, suspend, reason: suspend ? reason : undefined });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setReason("");
      if (result.data.authBan) toast.success(suspend ? s.suspendedDone : s.restoredDone);
      else toast.warning(suspend ? s.suspendedAppOnly : s.restoredAppOnly);
    });
  }

  return (
    <>
      <Button variant={suspend ? "destructive" : "outline"} className="h-11" onClick={() => setOpen(true)}>
        {suspend ? s.suspend : s.unsuspend}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{suspend ? s.suspendTitle(name) : s.unsuspendTitle(name)}</DialogTitle>
            <DialogDescription>{suspend ? s.suspendBody : s.unsuspendBody}</DialogDescription>
          </DialogHeader>
          {suspend && (
            <div className="space-y-2">
              <Label htmlFor={reasonId}>{s.reasonLabel}</Label>
              <Textarea
                id={reasonId}
                value={reason}
                maxLength={500}
                rows={3}
                onChange={(e) => setReason(e.target.value)}
                aria-invalid={Boolean(error)}
              />
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" className="h-11" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button variant={suspend ? "destructive" : "default"} className="h-11" disabled={pending} onClick={submit}>
              {pending ? s.working : s.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
