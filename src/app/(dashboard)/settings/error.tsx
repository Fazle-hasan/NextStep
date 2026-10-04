"use client";

import { ErrorState } from "@/components/shared/ErrorState";

export default function SettingsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}
