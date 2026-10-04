"use client";

import { ImagePlusIcon, SendIcon } from "lucide-react";
import { useId, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { BUCKETS, PHOTO_MAX_BYTES, PHOTO_MIME_TYPES } from "@/lib/supabase/storage";
import { reencodeImage } from "@/lib/utils/image";

import { sendMessage } from "../actions";
import { MESSAGE_MAX_LENGTH } from "../schemas";
import { chatStrings as s } from "../strings";
import type { ChatMessage } from "../types";

type Props = {
  conversationId: string;
  // Set when nobody can send (a block exists); shown instead of the composer.
  disabledReason: string | null;
  onSent: (message: ChatMessage) => void;
};

export function MessageComposer({ conversationId, disabledReason, onSent }: Props) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = pending || uploading;

  if (disabledReason) {
    return (
      <p role="status" className="rounded-lg border bg-muted/50 px-3 py-3 text-center text-sm text-muted-foreground">
        {disabledReason}
      </p>
    );
  }

  function submit(attachmentPath?: string) {
    const body = text.trim();
    if (!body && !attachmentPath) return;
    setError(null);
    startTransition(async () => {
      const result = await sendMessage({ conversationId, body, attachmentPath });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setText("");
      onSent(result.data);
    });
  }

  async function handleFile(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) return setError(s.errors.imageType);
    if (file.size > PHOTO_MAX_BYTES * 4) return setError(s.errors.imageSize);

    setError(null);
    setUploading(true);
    try {
      // Re-encoding strips EXIF (including GPS) and shrinks the photo.
      const blob = await reencodeImage(file);
      if (blob.size > PHOTO_MAX_BYTES) {
        setError(s.errors.imageSize);
        return;
      }
      const path = `${conversationId}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await createClient()
        .storage.from(BUCKETS.chatAttachments)
        .upload(path, blob, { contentType: "image/jpeg" });
      if (uploadError) {
        setError(s.errors.upload);
        return;
      }
      submit(path);
    } catch {
      setError(s.errors.upload);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      className="space-y-1"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {uploading && (
        <p role="status" className="text-sm text-muted-foreground">
          {s.uploading}
        </p>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={PHOTO_MIME_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          className="size-11 shrink-0"
          disabled={busy}
          aria-label={s.attach}
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlusIcon aria-hidden="true" />
        </Button>
        <div className="min-w-0 flex-1">
          <Label htmlFor={inputId} className="sr-only">
            {s.composerLabel}
          </Label>
          <Textarea
            id={inputId}
            value={text}
            rows={1}
            maxLength={MESSAGE_MAX_LENGTH}
            placeholder={s.composerPlaceholder}
            aria-describedby={`${inputId}-hint`}
            className="max-h-32 min-h-11 resize-none"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                if (!busy) submit();
              }
            }}
          />
        </div>
        <Button type="submit" size="icon-lg" className="size-11 shrink-0" disabled={busy || text.trim() === ""} aria-label={s.send}>
          <SendIcon aria-hidden="true" />
        </Button>
      </div>
      <p id={`${inputId}-hint`} className="hidden text-xs text-muted-foreground sm:block">
        {s.composerHint}
      </p>
    </form>
  );
}
