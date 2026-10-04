"use client";

import { SlidersHorizontal } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";

import { searchStrings as s } from "../strings";

type Props = { activeCount: number; children: React.ReactNode };

// On phones the filters are collapsed behind a button so results stay visible; on desktop they are always shown.
export function FilterDisclosure({ activeCount, children }: Props) {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full md:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <SlidersHorizontal aria-hidden="true" />
        {s.filtersWithCount(activeCount)}
        <span className="sr-only">{open ? s.hideFilters : s.showFilters}</span>
      </Button>
      <div id={panelId} className={open ? "space-y-5" : "hidden space-y-5 md:block"}>
        {children}
      </div>
    </div>
  );
}
