"use client";

import { LockIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils/dates";

import { addPrivateNote, deletePrivateNote, updatePrivateNote } from "../actions";
import { mentorStrings } from "../strings";
import type { PrivateNote } from "../types";

const s = mentorStrings.notes;

// The mentor's own notes about a session. Never shown to the mentee (RLS: mentor only).
export function PrivateNotes({ sessionId, notes }: { sessionId: string; notes: PrivateNote[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>, after: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? mentorStrings.errors.invalid);
        return;
      }
      after();
      router.refresh();
    });
  }

  function add(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) {
      setError(mentorStrings.errors.note);
      return;
    }
    run(
      () => addPrivateNote({ sessionId, body: draft }),
      () => setDraft(""),
    );
  }

  function save(noteId: string) {
    if (!editText.trim()) {
      setError(mentorStrings.errors.note);
      return;
    }
    run(
      () => updatePrivateNote({ noteId, body: editText }),
      () => setEditingId(null),
    );
  }

  function remove(noteId: string) {
    if (!window.confirm(s.confirmDelete)) return;
    run(
      () => deletePrivateNote({ id: noteId }),
      () => {},
    );
  }

  return (
    <section className="space-y-3 rounded-xl border p-4" aria-labelledby="private-notes">
      <div className="space-y-1">
        <h2 id="private-notes" className="flex items-center gap-2 text-lg font-semibold">
          <LockIcon className="size-4" aria-hidden="true" />
          {s.title}
        </h2>
        <p className="text-sm text-muted-foreground">{s.onlyYou}</p>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.empty}</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="space-y-2 rounded-lg bg-muted/50 p-3">
              {editingId === note.id ? (
                <>
                  <Label htmlFor={`note-edit-${note.id}`}>{s.editLabel}</Label>
                  <Textarea
                    id={`note-edit-${note.id}`}
                    rows={3}
                    maxLength={2000}
                    className="bg-background text-base"
                    value={editText}
                    onChange={(event) => setEditText(event.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="h-10" onClick={() => save(note.id)} disabled={pending}>
                      {pending ? s.saving : s.save}
                    </Button>
                    <Button size="sm" variant="outline" className="h-10" onClick={() => setEditingId(null)} disabled={pending}>
                      {s.cancel}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm break-words whitespace-pre-line">{note.body}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mr-auto text-xs text-muted-foreground">{formatDate(note.createdAt)}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-10"
                      disabled={pending}
                      onClick={() => {
                        setEditingId(note.id);
                        setEditText(note.body);
                        setError(null);
                      }}
                    >
                      {s.edit}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-10" disabled={pending} onClick={() => remove(note.id)}>
                      {s.delete}
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="space-y-2" noValidate>
        <Label htmlFor="note-new">{s.label}</Label>
        <Textarea id="note-new" rows={3} maxLength={2000} className="text-base" value={draft} onChange={(event) => setDraft(event.target.value)} />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" variant="outline" className="h-11" disabled={pending}>
          {pending ? s.saving : s.add}
        </Button>
      </form>
    </section>
  );
}
