"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Enums } from "@/types/database";

import { moveApplicant } from "../actions";
import type { EmployerStatus } from "../schemas";
import { pipelineStrings as s } from "../strings";

import { StageSelect } from "./StageSelect";

type Props = { applicationId: string; status: Enums<"application_status"> };

// Change the stage from the applicant page, with an optional private note.
export function ApplicantStageForm({ applicationId, status }: Props) {
  const router = useRouter();
  const [next, setNext] = useState<Enums<"application_status">>(status);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (status === "withdrawn") {
    return <p className="text-sm text-muted-foreground">{s.withdrawnNotice}</p>;
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await moveApplicant({ applicationId, status: next as EmployerStatus, note });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNote("");
      toast.success(s.statusUpdated);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="stage">{s.statusLabel}</Label>
        <StageSelect id="stage" value={next} onChange={setNext} disabled={pending} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="stage-note">{s.statusNoteLabel}</Label>
        <Textarea
          id="stage-note"
          value={note}
          maxLength={2000}
          rows={3}
          className="text-base"
          aria-describedby="stage-note-hint"
          onChange={(e) => setNote(e.target.value)}
        />
        <p id="stage-note-hint" className="text-sm text-muted-foreground">
          {s.statusNoteHint}
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="h-11 w-full sm:w-auto" disabled={pending || (next === status && !note.trim()) || next === "applied"}>
        {pending ? s.updating : s.updateStatus}
      </Button>
    </form>
  );
}
