"use client";

import { Controller, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  label: string;
  hint?: string;
  disabled?: boolean;
};

// A labelled checkbox bound to a react-hook-form boolean field.
export function CheckboxField<T extends FieldValues>({ name, label, hint, disabled }: Props<T>) {
  const { control } = useFormContext<T>();
  const hintId = `${name}-hint`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex min-h-11 items-start gap-3 py-2">
          <Checkbox
            id={name}
            ref={field.ref}
            checked={Boolean(field.value)}
            disabled={disabled}
            onCheckedChange={(checked) => field.onChange(checked === true)}
            onBlur={field.onBlur}
            aria-describedby={hint ? hintId : undefined}
            className="mt-0.5 size-5"
          />
          <div className="space-y-1">
            <Label htmlFor={name} className="leading-snug font-normal">
              {label}
            </Label>
            {hint && (
              <p id={hintId} className="text-sm text-muted-foreground">
                {hint}
              </p>
            )}
          </div>
        </div>
      )}
    />
  );
}
