"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createReferral, deleteReferral } from "../actions";
import type { ReferableJob } from "../queries";
import { referralsStrings as s } from "../strings";

import { CopyLinkButton } from "./CopyLinkButton";

type Props = { job: ReferableJob; siteUrl: string };

// One open job: create a referral link, or show the existing link to copy or delete.
export function ReferralJobItem({ job, siteUrl }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const noteId = `referral-note-${job.id}`;

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  return (
    <li className="space-y-3 rounded-lg border p-3">
      <p className="font-medium">
        <Link href={`/jobs/${job.id}`} className="hover:underline">
          {job.title}
        </Link>
      </p>

      {job.referral ? (
        <>
          <CopyLinkButton url={`${siteUrl}/jobs/${job.id}?ref=${job.referral.id}`} />
          {job.referral.note && <p className="text-sm break-words text-muted-foreground">{s.yourNote(job.referral.note)}</p>}
          <Button
            type="button"
            variant="ghost"
            className="h-11"
            disabled={pending}
            aria-label={s.deleteLabel(job.title)}
            onClick={() => run(() => deleteReferral({ referralId: job.referral!.id }))}
          >
            {s.deleteLink}
          </Button>
        </>
      ) : (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            run(() => createReferral({ jobId: job.id, note }));
          }}
        >
          <Label htmlFor={noteId}>{s.noteLabel}</Label>
          <Input
            id={noteId}
            value={note}
            maxLength={500}
            placeholder={s.notePlaceholder}
            className="h-11 text-base"
            onChange={(e) => setNote(e.target.value)}
          />
          <Button type="submit" className="h-11 w-full sm:w-auto" disabled={pending}>
            {pending ? s.creating : s.createLink}
          </Button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}
