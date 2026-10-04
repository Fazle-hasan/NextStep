"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Props<V extends string> = {
  // Used as the id prefix for each checkbox.
  name: string;
  legend: string;
  options: readonly { value: V; label: string }[];
  value: readonly V[];
  onChange: (value: V[]) => void;
  hint?: string;
  error?: string;
  emptyText?: string;
};

// A labelled group of checkboxes for picking several values.
export function MultiCheckGroup<V extends string>({ name, legend, options, value, onChange, hint, error, emptyText }: Props<V>) {
  function toggle(option: V, checked: boolean) {
    onChange(checked ? [...value.filter((v) => v !== option), option] : value.filter((v) => v !== option));
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm leading-none font-medium">{legend}</legend>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {options.length === 0 && emptyText ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="grid gap-x-4 sm:grid-cols-2">
          {options.map((option) => {
            const id = `${name}-${option.value}`;
            return (
              <div key={option.value} className="flex min-h-11 items-center gap-3">
                <Checkbox
                  id={id}
                  className="size-5"
                  checked={value.includes(option.value)}
                  onCheckedChange={(checked) => toggle(option.value, checked === true)}
                />
                <Label htmlFor={id} className="leading-snug font-normal">
                  {option.label}
                </Label>
              </div>
            );
          })}
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
