"use client";

import { useId } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Props<T extends string> = {
  legend: string;
  options: readonly T[];
  labels: Record<T, string>;
  selected: T[];
  onChange: (selected: T[]) => void;
};

// A labelled group of checkboxes for picking several values.
export function CheckList<T extends string>({ legend, options, labels, selected, onChange }: Props<T>) {
  const baseId = useId();

  function toggle(option: T, checked: boolean) {
    onChange(checked ? options.filter((o) => o === option || selected.includes(o)) : selected.filter((o) => o !== option));
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <ul className="grid gap-x-4 sm:grid-cols-2 md:grid-cols-1">
        {options.map((option) => {
          const id = `${baseId}-${option}`;
          return (
            <li key={option} className="flex min-h-11 items-center gap-2.5">
              <Checkbox id={id} checked={selected.includes(option)} onCheckedChange={(checked) => toggle(option, checked === true)} />
              <Label htmlFor={id} className="text-sm font-normal">
                {labels[option]}
              </Label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
