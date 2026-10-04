"use client";

import { BanIcon } from "lucide-react";
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

import { blockUser, unblockUser } from "../actions";
import { safetyStrings as s } from "../strings";

type Props = {
  userId: string;
  isBlocked?: boolean;
};

export function BlockButton({ userId, isBlocked = false }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: typeof blockUser, successMessage: string) {
    setError(null);
    startTransition(async () => {
      const result = await action({ userId });
      if (!result.ok) {
        setError(result.error);
        if (!open) toast.error(result.error);
        return;
      }
      toast.success(successMessage);
      setOpen(false);
    });
  }

  if (isBlocked) {
    return (
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(unblockUser, s.unblocked)}>
        {s.unblock}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <BanIcon aria-hidden="true" />
          {s.block}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{s.blockTitle}</DialogTitle>
          <DialogDescription>{s.blockDescription}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {s.cancel}
          </Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => run(blockUser, s.blocked)}>
            {pending ? s.blocking : s.confirmBlock}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
