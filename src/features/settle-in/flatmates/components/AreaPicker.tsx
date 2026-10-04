"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { flatmateStrings as s } from "../strings";
import type { NeighbourhoodOption } from "../types";

type Props = {
  // Areas of the chosen city only.
  options: NeighbourhoodOption[];
  value: string[];
  onChange: (value: string[]) => void;
  error?: string;
};

// Multi-select of neighbourhoods as a checkbox list (large touch targets on mobile).
export function AreaPicker({ options, value, onChange, error }: Props) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{s.profile.areas}</legend>
      <p className="text-sm text-muted-foreground">{s.profile.areasHint}</p>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.profile.noAreas}</p>
      ) : (
        <div className="grid gap-x-4 sm:grid-cols-2">
          {options.map((area) => (
            <div key={area.id} className="flex min-h-11 items-center gap-3">
              <Checkbox
                id={`area-${area.id}`}
                checked={value.includes(area.id)}
                onCheckedChange={(checked) =>
                  onChange(checked ? [...value, area.id] : value.filter((id) => id !== area.id))
                }
              />
              <Label htmlFor={`area-${area.id}`} className="font-normal">
                {area.name}
              </Label>
            </div>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
