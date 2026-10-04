"use client";

import { Button } from "@/components/ui/button";
import { PinPicker, type MapPoint } from "@/lib/maps";

import { placesStrings } from "../strings";

const s = placesStrings.suggestForm;

type Props = {
  value: MapPoint | null;
  initialCenter?: MapPoint;
  onChange: (point: MapPoint | null) => void;
};

// Optional pin for the suggested place. The picker shows a notice by itself when no map is available.
export function SuggestionLocationField({ value, initialCenter, onChange }: Props) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{s.location}</legend>
      <PinPicker value={value} onChange={onChange} initialCenter={initialCenter} ariaLabel={s.locationLabel} />
      {value && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">{s.locationSet}</p>
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => onChange(null)}>
            {s.locationClear}
          </Button>
        </div>
      )}
    </fieldset>
  );
}
