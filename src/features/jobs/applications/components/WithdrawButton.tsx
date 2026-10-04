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

import { withdrawApplication } from "../actions";
import { applicationsStrings as s } from "../strings";

export function WithdrawButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await withdrawApplication({ applicationId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.withdrawn);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="h-11">
          {s.withdraw}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{s.withdrawTitle}</DialogTitle>
          <DialogDescription>{s.withdrawBody}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={() => setOpen(false)} disabled={pending}>
            {s.cancel}
          </Button>
          <Button variant="destructive" className="h-11" onClick={confirm} disabled={pending}>
            {pending ? s.withdrawing : s.withdrawConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
