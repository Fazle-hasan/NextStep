"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { toggleSavedJob } from "../actions";
import { searchStrings as s } from "../strings";

type Props = {
  jobId: string;
  initialSaved: boolean;
  // "icon" for job cards, "full" for the job page.
  variant?: "icon" | "full";
  // Reload the page data after a change (used on the saved jobs list so removed jobs disappear).
  refreshOnChange?: boolean;
};

// Bookmark toggle. Updates straight away and rolls back if the server rejects the change.
export function SaveJobButton({ jobId, initialSaved, variant = "icon", refreshOnChange = false }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();
  const Icon = saved ? BookmarkCheck : Bookmark;

  function toggle() {
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const result = await toggleSavedJob({ jobId, save: next });
      if (!result.ok) {
        setSaved(!next);
        toast.error(result.error);
        return;
      }
      if (refreshOnChange) router.refresh();
    });
  }

  if (variant === "full") {
    return (
      <Button type="button" variant="outline" className="h-11" aria-pressed={saved} disabled={pending} onClick={toggle}>
        <Icon aria-hidden="true" className={saved ? "text-primary" : undefined} />
        {saved ? s.save.saved : s.save.save}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      className="size-11 shrink-0"
      aria-pressed={saved}
      aria-label={saved ? s.save.unsave : s.save.save}
      disabled={pending}
      onClick={toggle}
    >
      <Icon aria-hidden="true" className={saved ? "size-5 text-primary" : "size-5"} />
    </Button>
  );
}
