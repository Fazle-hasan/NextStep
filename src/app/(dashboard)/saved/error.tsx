"use client";

import { ErrorState } from "@/components/shared/ErrorState";

export default function SavedError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}
