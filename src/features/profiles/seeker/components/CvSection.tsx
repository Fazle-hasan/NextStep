"use client";

import { FileText, Upload } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { BUCKETS } from "@/lib/supabase/storage";
import { formatDate } from "@/lib/utils/dates";
import type { Tables } from "@/types/database";

import { deleteCv, getOwnCvUrl, registerCv, setDefaultCv } from "../cv-actions";
import { cvFileError, MAX_CVS } from "../schemas";
import { seekerStrings as s } from "../strings";

import { ConfirmDeleteButton } from "./ConfirmDeleteButton";

type Props = { userId: string; cvs: Tables<"cvs">[] };

function sizeText(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function CvSection({ userId, cvs }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const atLimit = cvs.length >= MAX_CVS;

  async function upload(file: File) {
    setError(null);
    const problem = atLimit ? s.errors.cvLimit : cvFileError(file);
    if (problem) {
      setError(problem);
      return;
    }
    setUploading(true);
    try {
      // The file goes straight to the private bucket; the server action then records it.
      const storagePath = `${userId}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await createClient()
        .storage.from(BUCKETS.cvs)
        .upload(storagePath, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) {
        setError(s.errors.cvUpload);
        return;
      }
      const result = await registerCv({ storagePath, fileName: file.name, sizeBytes: file.size });
      if (result.ok) toast.success(s.cv.uploaded);
      else setError(result.error);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function view(cvId: string) {
    setError(null);
    // Open the tab during the click so pop-up blockers allow it, then point it at the signed link.
    const tab = window.open("", "_blank");
    startTransition(async () => {
      const result = await getOwnCvUrl(cvId);
      if (!result.ok) {
        tab?.close();
        setError(result.error);
        return;
      }
      if (tab) tab.location.href = result.data.url;
      else window.location.href = result.data.url;
    });
  }

  function makeDefault(cvId: string) {
    setError(null);
    startTransition(async () => {
      const result = await setDefaultCv(cvId);
      if (result.ok) toast.success(s.saved);
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{s.cv.intro}</p>
      {cvs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.cv.empty}</p>
      ) : (
        <ul className="divide-y">
          {cvs.map((cv) => (
            <li key={cv.id} className="space-y-2 py-3 first:pt-0">
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium break-words">{cv.file_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {sizeText(cv.size_bytes)} · {formatDate(cv.created_at)}
                  </p>
                </div>
                {cv.is_default && <Badge variant="secondary">{s.cv.default}</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={() => view(cv.id)}>
                  {s.cv.view}
                </Button>
                {!cv.is_default && (
                  <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={() => makeDefault(cv.id)}>
                    {s.cv.makeDefault}
                  </Button>
                )}
                <ConfirmDeleteButton
                  label={`${s.delete}: ${cv.file_name}`}
                  question={s.cv.confirmDelete}
                  onConfirm={() => deleteCv(cv.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <input
          ref={inputRef}
          id="cv-file"
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={uploading || atLimit}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button asChild variant="default" className="h-11" aria-disabled={uploading || atLimit}>
          <label htmlFor="cv-file" className={uploading || atLimit ? "pointer-events-none opacity-50" : "cursor-pointer"}>
            <Upload aria-hidden="true" />
            {uploading ? s.cv.uploading : s.cv.upload}
          </label>
        </Button>
        {atLimit && <p className="mt-2 text-sm text-muted-foreground">{s.errors.cvLimit}</p>}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
