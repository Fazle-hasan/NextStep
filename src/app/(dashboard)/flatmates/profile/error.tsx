"use client";

import { ErrorState } from "@/components/shared/ErrorState";

export default function FlatmateProfileError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}
