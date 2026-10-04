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

import { resolveReport } from "../actions";
import type { ReportAction } from "../schemas";
import { moderationStrings as s } from "../strings";

type Props = {
  reportId: string;
  // A reported user cannot be hidden, only warned or suspended.
  canHide: boolean;
  // False when the content (and so its owner) no longer exists.
  hasOwner: boolean;
};

// Every action goes through a confirm dialog with a note.
export function ReportActions({ reportId, canHide, hasOwner }: Props) {
  const noteId = useId();
  const [action, setAction] = useState<ReportAction | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open(next: ReportAction) {
    setNote("");
    setError(null);
    setAction(next);
  }

  function submit() {
    if (!action) return;
    setError(null);
    startTransition(async () => {
      const result = await resolveReport({ reportId, action, note });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAction(null);
      toast.success(s.done);
    });
  }

  const dialog = action ? s.dialog[action] : null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="h-11" onClick={() => open("dismiss")}>
        {s.actions.dismiss}
      </Button>
      {canHide && (
        <Button variant="outline" className="h-11" onClick={() => open("hide")}>
          {s.actions.hide}
        </Button>
      )}
      {hasOwner && (
        <>
          <Button variant="outline" className="h-11" onClick={() => open("warn")}>
            {s.actions.warn}
          </Button>
          <Button variant="destructive" className="h-11" onClick={() => open("suspend")}>
            {s.actions.suspend}
          </Button>
        </>
      )}
      <Dialog open={action !== null} onOpenChange={(next) => !next && setAction(null)}>
        <DialogContent>
          {dialog && (
            <>
              <DialogHeader>
                <DialogTitle>{dialog.title}</DialogTitle>
                <DialogDescription>{dialog.body}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor={noteId}>{dialog.note}</Label>
                <Textarea
                  id={noteId}
                  value={note}
                  maxLength={1000}
                  rows={4}
                  onChange={(e) => setNote(e.target.value)}
                  aria-invalid={Boolean(error)}
                />
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" className="h-11" onClick={() => setAction(null)}>
                  {s.cancel}
                </Button>
                <Button
                  variant={action === "suspend" ? "destructive" : "default"}
                  className="h-11"
                  disabled={pending}
                  onClick={submit}
                >
                  {pending ? s.working : s.confirm}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
