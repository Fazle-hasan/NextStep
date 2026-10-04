"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils/dates";

import { addApplicantNote, deleteApplicantNote } from "../actions";
import type { ApplicantNote } from "../queries";
import { pipelineStrings as s } from "../strings";

type Props = { applicationId: string; notes: ApplicantNote[] };

// Employer-private notes. The applicant can never read these (RLS).
export function NotesPanel({ applicationId, notes }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addApplicantNote({ applicationId, body });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      toast.success(s.noteAdded);
      router.refresh();
    });
  }

  function onDelete(noteId: string) {
    startTransition(async () => {
      const result = await deleteApplicantNote({ noteId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(s.noteDeleted);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{s.notesHint}</p>
      <form onSubmit={onSubmit} className="space-y-2">
        <Label htmlFor="new-note">{s.noteLabel}</Label>
        <Textarea
          id="new-note"
          value={body}
          maxLength={2000}
          rows={3}
          className="text-base"
          onChange={(e) => setBody(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="h-11" disabled={pending || !body.trim()}>
          {pending ? s.addingNote : s.addNote}
        </Button>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.noNotes}</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {note.authorName ?? s.unknownAuthor} · {formatDateTime(note.createdAt)}
                </p>
                {note.isMine && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label={s.deleteNote}
                    disabled={pending}
                    onClick={() => onDelete(note.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
              </div>
              <p className="text-sm break-words whitespace-pre-line">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
