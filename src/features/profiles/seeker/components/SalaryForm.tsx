"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/features/profiles/components/Field";

import { saveSalary } from "../actions";
import { salarySchema, type SalaryInput, type SalaryValues } from "../schemas";
import { seekerStrings as s } from "../strings";

import { SwitchRow } from "./SwitchRow";

export function SalaryForm({ defaults }: { defaults: SalaryInput }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    control,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<SalaryInput, unknown, SalaryValues>({ resolver: zodResolver(salarySchema), defaultValues: defaults });

  function onValid() {
    setError(null);
    startTransition(async () => {
      const result = await saveSalary(getValues());
      if (result.ok) toast.success(s.saved);
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-5" noValidate>
      <p className="text-sm text-muted-foreground">{s.salary.intro}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field id="salary-min" label={s.salary.min} error={errors.minLakh?.message}>
          <Input
            id="salary-min"
            inputMode="decimal"
            placeholder="6"
            className="h-11 text-base"
            aria-invalid={Boolean(errors.minLakh)}
            {...register("minLakh")}
          />
        </Field>
        <Field id="salary-max" label={s.salary.max} error={errors.maxLakh?.message}>
          <Input
            id="salary-max"
            inputMode="decimal"
            placeholder="8"
            className="h-11 text-base"
            aria-invalid={Boolean(errors.maxLakh)}
            {...register("maxLakh")}
          />
        </Field>
      </div>
      <Controller
        control={control}
        name="shareWithEmployers"
        render={({ field }) => (
          <SwitchRow
            id="salary-share"
            label={s.salary.share}
            hint={s.salary.shareHint}
            checked={field.value}
            onCheckedChange={field.onChange}
          />
        )}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="h-11 w-full sm:w-auto sm:px-8" disabled={pending}>
        {pending ? s.saving : s.save}
      </Button>
    </form>
  );
}
