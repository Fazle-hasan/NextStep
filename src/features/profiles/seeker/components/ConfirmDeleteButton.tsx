"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/result";

import { seekerStrings as s } from "../strings";

type Props = {
  // What is being deleted, for screen readers, e.g. "Delete Accountant at Acme".
  label: string;
  question: string;
  onConfirm: () => Promise<ActionResult>;
};

// Delete with a confirmation dialog (never window.confirm).
export function ConfirmDeleteButton({ label, question, onConfirm }: Props) {
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
      toast.success(s.saved);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="size-11 text-destructive" aria-label={label}>
          <Trash2 aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{question}</DialogTitle>
          <DialogDescription>{label}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" className="h-11" onClick={() => setOpen(false)}>
            {s.cancel}
          </Button>
          <Button type="button" variant="destructive" className="h-11" disabled={pending} onClick={confirm}>
            {pending ? s.deleting : s.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
