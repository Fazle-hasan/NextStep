"use client";

import { BadgeCheck, Clock } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

import { requestListerVerification } from "../actions";
import type { ListerBadgeStatus } from "../queries";
import { flatsStrings } from "../strings";

const s = flatsStrings.listerBadge;

// The lister's ID-verified badge: shows the state, or lets them ask an admin for it.
export function ListerBadgeCard({ status }: { status: ListerBadgeStatus }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await requestListerVerification({ note: note.trim() || undefined });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.sent);
      setOpen(false);
      setNote("");
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 font-medium">
            {status === "verified" && <BadgeCheck className="size-5 text-primary" aria-hidden="true" />}
            {status === "pending" && <Clock className="size-5 text-muted-foreground" aria-hidden="true" />}
            {status === "verified" ? s.verified : status === "pending" ? s.pending : s.title}
          </p>
          <p className="text-sm text-muted-foreground">
            {status === "verified" ? s.verifiedBody : status === "pending" ? s.pendingBody : s.intro}
          </p>
        </div>
        {status === "none" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-11">
                {s.request}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{s.dialogTitle}</DialogTitle>
                <DialogDescription>{s.dialogBody}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="lister-badge-note">{s.noteLabel}</Label>
                <Textarea
                  id="lister-badge-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={1000}
                  rows={3}
                />
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                  {s.cancel}
                </Button>
                <Button onClick={submit} disabled={pending}>
                  {pending ? s.working : s.send}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
