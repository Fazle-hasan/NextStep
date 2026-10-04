"use client";

import { ConfirmActionButton } from "@/features/settle-in/flats/components/ConfirmActionButton";

import { deleteGuide } from "../actions";
import { placesAdminStrings } from "../strings";

const s = placesAdminStrings;

// Deletes the guide of a neighbourhood after a confirmation.
export function DeleteGuideButton({ neighbourhoodId }: { neighbourhoodId: string }) {
  return (
    <ConfirmActionButton
      label={s.guide.delete}
      question={s.guide.deleteQuestion}
      body={s.guide.deleteBody}
      confirmLabel={s.guide.delete}
      cancelLabel={s.cancel}
      pendingLabel={s.working}
      successMessage={s.guide.deleted}
      onConfirm={() => deleteGuide({ id: neighbourhoodId })}
    />
  );
}
