"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/result";

type Props = {
  label: string;
  question: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  pendingLabel: string;
  successMessage: string;
  // Where to go afterwards; stays on the page (and refreshes it) when omitted.
  redirectTo?: string;
  onConfirm: () => Promise<ActionResult>;
};

// A destructive action behind a confirmation dialog (never window.confirm).
export function ConfirmActionButton({
  label,
  question,
  body,
  confirmLabel,
  cancelLabel,
  pendingLabel,
  successMessage,
  redirectTo,
  onConfirm,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      toast.success(successMessage);
      if (redirectTo) router.replace(redirectTo);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11 text-destructive">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{question}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" className="h-11" onClick={() => setOpen(false)}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="destructive" className="h-11" disabled={pending} onClick={confirm}>
            {pending ? pendingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
