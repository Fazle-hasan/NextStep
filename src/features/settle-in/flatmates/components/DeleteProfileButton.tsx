"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { deleteFlatmateProfile } from "../actions";
import { flatmateStrings as s } from "../strings";

// Delete with a confirmation dialog (never window.confirm).
export function DeleteProfileButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteFlatmateProfile();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      toast.success(s.profile.deleted);
      router.push("/flatmates");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11 w-full text-destructive sm:w-auto">
          {s.profile.delete}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{s.profile.deleteQuestion}</DialogTitle>
          <DialogDescription>{s.profile.deleteBody}</DialogDescription>
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
            {pending ? s.profile.deleting : s.profile.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
