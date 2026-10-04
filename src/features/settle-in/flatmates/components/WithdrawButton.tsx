"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { withdrawFlatmateConnection } from "../actions";
import { flatmateStrings as s } from "../strings";

// Take back a connect request that is still pending.
export function WithdrawButton({ connectionId }: { connectionId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function withdraw() {
    setError(null);
    startTransition(async () => {
      const result = await withdrawFlatmateConnection({ connectionId });
      if (result.ok) toast.success(s.requests.withdrawn);
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={withdraw}>
        {pending ? s.requests.working : s.requests.withdraw}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
