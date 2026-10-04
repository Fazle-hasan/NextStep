"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { SwitchRow } from "@/features/profiles/seeker/components/SwitchRow";

import { setFlatmateActive } from "../actions";
import { flatmateStrings as s } from "../strings";

// Pause or resume the viewer's flatmate profile from the match page.
export function ActiveSwitch({ isActive }: { isActive: boolean }) {
  const [checked, setChecked] = useState(isActive);
  const [pending, startTransition] = useTransition();

  function change(next: boolean) {
    if (pending) return;
    setChecked(next);
    startTransition(async () => {
      const result = await setFlatmateActive({ isActive: next });
      if (result.ok) {
        toast.success(s.saved);
      } else {
        setChecked(!next);
        toast.error(result.error);
      }
    });
  }

  return (
    <SwitchRow id="flatmate-active" label={s.mine.active} hint={s.mine.activeHint} checked={checked} onCheckedChange={change} />
  );
}
