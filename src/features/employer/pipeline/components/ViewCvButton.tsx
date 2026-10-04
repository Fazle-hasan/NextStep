"use client";

import { FileText } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import { getCvSignedUrl } from "../actions";
import { pipelineStrings as s } from "../strings";

type Props = { applicationId: string };

// Asks the server for a 10-minute signed link and opens it in a new tab.
export function ViewCvButton({ applicationId }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onClick() {
    setError(null);
    // Open the tab during the click so pop-up blockers allow it, then point it at the signed link.
    const tab = window.open("", "_blank");
    startTransition(async () => {
      const result = await getCvSignedUrl({ applicationId });
      if (!result.ok) {
        tab?.close();
        setError(result.error);
        return;
      }
      if (tab) {
        tab.opener = null;
        tab.location.href = result.data.url;
      } else {
        window.location.assign(result.data.url);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={onClick} aria-describedby="cv-hint">
        <FileText aria-hidden="true" />
        {pending ? s.openingCv : s.viewCv}
      </Button>
      <p id="cv-hint" className="text-sm text-muted-foreground">
        {s.cvHint}
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
