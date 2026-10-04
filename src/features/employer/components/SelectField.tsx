"use client";

import { Controller, useFormContext, type FieldPath, type FieldValues } from "react-hook-form";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "@/features/profiles/components/Field";

// Radix Select cannot hold an empty value, so "no choice" uses this sentinel and maps to "".
const NONE = "__none__";

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  hint?: string;
  // Adds a first option that clears the field.
  emptyLabel?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
};

// A labelled select bound to a react-hook-form string field ("" = nothing chosen).
export function SelectField<T extends FieldValues>({
  name,
  label,
  placeholder,
  options,
  hint,
  emptyLabel,
  disabled,
  onValueChange,
}: Props<T>) {
  const { control } = useFormContext<T>();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field id={name} label={label} hint={hint} error={fieldState.error?.message}>
          <Select
            value={field.value ? String(field.value) : emptyLabel ? NONE : undefined}
            disabled={disabled}
            onValueChange={(value) => {
              const next = value === NONE ? "" : value;
              field.onChange(next);
              onValueChange?.(next);
            }}
          >
            <SelectTrigger
              id={name}
              ref={field.ref}
              onBlur={field.onBlur}
              className="h-11 w-full text-base"
              aria-invalid={Boolean(fieldState.error)}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {emptyLabel && <SelectItem value={NONE}>{emptyLabel}</SelectItem>}
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  );
}
