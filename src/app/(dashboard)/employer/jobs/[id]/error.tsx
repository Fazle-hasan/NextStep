"use client";

import { Button } from "@/components/ui/button";
import { pipelineStrings as s } from "@/features/employer/pipeline/strings";

export default function PipelineError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="space-y-3 rounded-lg border p-6 text-center">
      <h1 className="text-lg font-semibold">{s.loadErrorTitle}</h1>
      <p className="text-sm text-muted-foreground">{s.loadErrorBody}</p>
      <Button className="h-11" onClick={reset}>
        {s.retry}
      </Button>
    </div>
  );
}
