"use client";

import { ErrorState } from "@/components/shared/ErrorState";

export default function ApplicationsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}
