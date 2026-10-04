"use client";

import { useEffect, useState } from "react";

import { getAttachmentUrl } from "../actions";
import { chatStrings as s } from "../strings";

type State = { status: "loading" } | { status: "ready"; url: string } | { status: "error" };

// A chat photo from the private bucket, shown through a short-lived signed URL.
export function AttachmentImage({ messageId }: { messageId: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    void getAttachmentUrl({ messageId }).then((result) => {
      if (cancelled) return;
      setState(result.ok ? { status: "ready", url: result.data.url } : { status: "error" });
    });
    return () => {
      cancelled = true;
    };
  }, [messageId]);

  if (state.status === "error") {
    return <p className="text-sm italic opacity-80">{s.photoUnavailable}</p>;
  }
  if (state.status === "loading") {
    return (
      <div className="flex h-40 w-56 max-w-full items-center justify-center rounded-lg bg-black/10 text-xs" aria-busy="true">
        {s.photoLoading}
      </div>
    );
  }

  return (
    <a href={state.url} target="_blank" rel="noopener noreferrer" aria-label={s.openPhoto} className="block">
      {/* Signed URLs expire, so the Next.js image optimiser is not used here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={state.url}
        alt={s.photoAlt}
        className="max-h-72 w-auto max-w-full rounded-lg object-contain"
        onError={() => setState({ status: "error" })}
      />
    </a>
  );
}
