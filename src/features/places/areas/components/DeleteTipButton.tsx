"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { deleteAreaTip } from "../actions";
import { areaStrings as s } from "../strings";

// Lets the author remove their own tip (soft delete; kept for moderation).
export function DeleteTipButton({ tipId }: { tipId: string }) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(s.tips.removeConfirm)) return;
    startTransition(async () => {
      const result = await deleteAreaTip({ tipId });
      if (result.ok) toast.success(s.tips.removed);
      else toast.error(result.error);
    });
  }

  return (
    <Button type="button" variant="ghost" size="sm" className="h-9" onClick={onClick} disabled={pending}>
      <Trash2 aria-hidden="true" />
      {s.tips.remove}
    </Button>
  );
}
