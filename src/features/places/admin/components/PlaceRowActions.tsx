"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/features/settle-in/flats/components/ConfirmActionButton";
import type { ActionResult } from "@/lib/result";

import { deletePlace, setPlaceHidden, setPlaceVerified } from "../actions";
import { placesAdminStrings } from "../strings";

const s = placesAdminStrings;

type Props = { id: string; isVerified: boolean; isHidden: boolean };

// Edit, verify, hide and delete for one place in the admin list.
export function PlaceRowActions({ id, isVerified, isHidden }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(s.saved);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" className="h-11">
        <Link href={`/admin/places/${id}`}>{s.places.edit}</Link>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-11"
        disabled={pending}
        onClick={() => run(() => setPlaceVerified({ id, value: !isVerified }))}
      >
        {isVerified ? s.places.unverify : s.places.verify}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-11"
        disabled={pending}
        onClick={() => run(() => setPlaceHidden({ id, value: !isHidden }))}
      >
        {isHidden ? s.places.unhide : s.places.hide}
      </Button>
      <ConfirmActionButton
        label={s.places.delete}
        question={s.places.deleteQuestion}
        body={s.places.deleteBody}
        confirmLabel={s.places.delete}
        cancelLabel={s.cancel}
        pendingLabel={s.working}
        successMessage={s.places.deleted}
        onConfirm={() => deletePlace({ id })}
      />
    </div>
  );
}
