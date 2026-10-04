"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { respondFlatmateConnection } from "../actions";
import { flatmateStrings as s } from "../strings";

// Accept or decline a connect request the viewer received. Accepting goes straight to the new chat.
export function RespondButtons({ connectionId }: { connectionId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function respond(accept: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await respondFlatmateConnection({ connectionId, accept });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(accept ? s.requests.accepted : s.requests.declined);
      if (result.data.conversationId) router.push(`/messages/${result.data.conversationId}`);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <Button type="button" className="h-11 flex-1 sm:flex-none sm:px-6" disabled={pending} onClick={() => respond(true)}>
          {pending ? s.requests.working : s.requests.accept}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 sm:flex-none sm:px-6"
          disabled={pending}
          onClick={() => respond(false)}
        >
          {s.requests.decline}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
