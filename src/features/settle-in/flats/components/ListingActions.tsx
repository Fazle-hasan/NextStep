"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/result";
import type { Enums } from "@/types/database";

import { deleteListing, renewListing, setListingStatus } from "../actions";
import { flatsStrings } from "../strings";

import { ConfirmActionButton } from "./ConfirmActionButton";

const s = flatsStrings.manage;

type Props = {
  listingId: string;
  status: Enums<"listing_status">;
  // Past expires_at (even if the hourly job has not marked it yet).
  expired: boolean;
  hasAddress: boolean;
  // Where to go after deleting.
  afterDelete?: string;
};

// The lister's status controls: publish / pause / mark rented / renew / delete. Each goes through an RPC.
export function ListingActions({ listingId, status, expired, hasAddress, afterDelete }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.done);
      router.refresh();
    });
  }

  const live = status === "active" && !expired;
  const canRenew = status !== "rented" && (expired || status === "expired" || status === "active");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "paused" && !expired && (
          <Button
            type="button"
            className="h-11"
            disabled={pending || !hasAddress}
            onClick={() => run(() => setListingStatus({ listingId, status: "active" }))}
          >
            {s.activate}
          </Button>
        )}
        {live && (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={pending}
            onClick={() => run(() => setListingStatus({ listingId, status: "paused" }))}
          >
            {s.pause}
          </Button>
        )}
        {canRenew && (
          <Button
            type="button"
            variant={live ? "outline" : "default"}
            className="h-11"
            disabled={pending || !hasAddress}
            onClick={() => run(() => renewListing({ listingId }))}
          >
            {s.renew}
          </Button>
        )}
        {status !== "rented" && (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={pending}
            onClick={() => run(() => setListingStatus({ listingId, status: "rented" }))}
          >
            {s.rented}
          </Button>
        )}
        <ConfirmActionButton
          label={s.delete}
          question={s.deleteQuestion}
          body={s.deleteBody}
          confirmLabel={s.confirmDelete}
          cancelLabel={s.cancel}
          pendingLabel={s.working}
          successMessage={s.deleted}
          redirectTo={afterDelete}
          onConfirm={() => deleteListing({ listingId })}
        />
      </div>
      {!hasAddress && status !== "rented" && <p className="text-sm text-muted-foreground">{s.needAddress}</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
