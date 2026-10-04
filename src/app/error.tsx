"use client";

import { ErrorState } from "@/components/shared/ErrorState";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 items-center justify-center">
      <ErrorState onRetry={reset} />
    </main>
  );
}
