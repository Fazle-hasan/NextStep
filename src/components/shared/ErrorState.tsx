"use client";

import { Button } from "@/components/ui/button";

import { shellStrings } from "./strings";

// Shared body for route error boundaries.
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">{shellStrings.errors.title}</h1>
      <p className="text-muted-foreground">{shellStrings.errors.body}</p>
      <Button size="lg" className="h-11" onClick={onRetry}>
        {shellStrings.errors.retry}
      </Button>
    </div>
  );
}
