"use client";

import { Controller, useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/features/profiles/components/Field";

import type { JobFormInput } from "../schemas";
import { employerStrings } from "../strings";

const s = employerStrings.job;

// Annual salary range typed in lakh, plus whether the public may see it (D-024).
export function JobSalaryFields() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<JobFormInput>();

  return (
    <fieldset className="space-y-4">
      <legend className="text-base font-semibold">{s.salaryTitle}</legend>
      <p id="salary-hint" className="text-sm text-muted-foreground">
        {s.salaryHint}
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="salaryMinLakh" label={s.salaryMin} error={errors.salaryMinLakh?.message}>
          <Input
            id="salaryMinLakh"
            inputMode="decimal"
            className="h-11 text-base"
            aria-describedby="salary-hint"
            aria-invalid={Boolean(errors.salaryMinLakh)}
            {...register("salaryMinLakh")}
          />
        </Field>
        <Field id="salaryMaxLakh" label={s.salaryMax} error={errors.salaryMaxLakh?.message}>
          <Input
            id="salaryMaxLakh"
            inputMode="decimal"
            className="h-11 text-base"
            aria-describedby="salary-hint"
            aria-invalid={Boolean(errors.salaryMaxLakh)}
            {...register("salaryMaxLakh")}
          />
        </Field>
      </div>
      <Controller
        control={control}
        name="salaryVisible"
        render={({ field }) => (
          <div className="flex min-h-11 items-start gap-3">
            <Switch
              id="salaryVisible"
              ref={field.ref}
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-describedby="salary-visible-hint"
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label htmlFor="salaryVisible" className="font-normal">
                {s.salaryVisible}
              </Label>
              <p id="salary-visible-hint" className="text-sm text-muted-foreground">
                {s.salaryHiddenHint}
              </p>
            </div>
          </div>
        )}
      />
    </fieldset>
  );
}
