"use client";

import { ErrorState } from "@/components/shared/ErrorState";

export default function AdminAuditError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState onRetry={reset} />;
}
