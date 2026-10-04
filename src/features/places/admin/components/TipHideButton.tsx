"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { setTipHidden } from "../actions";
import { placesAdminStrings } from "../strings";

const s = placesAdminStrings;

type Props = { id: string; neighbourhoodId: string; isHidden: boolean };

// Hide or restore one community tip.
export function TipHideButton({ id, neighbourhoodId, isHidden }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = await setTipHidden({ id, neighbourhoodId, hidden: !isHidden });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(s.saved);
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={toggle}>
      {pending ? s.working : isHidden ? s.tips.restore : s.tips.hide}
    </Button>
  );
}
