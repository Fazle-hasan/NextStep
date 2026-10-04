"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/features/profiles/components/Field";

import { saveEducation } from "../actions";
import { educationSchema, type EducationInput, type EducationValues } from "../schemas";
import { seekerStrings as s } from "../strings";

type Props = { defaults: EducationInput; onDone: () => void };

export function EducationForm({ defaults, onDone }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<EducationInput, unknown, EducationValues>({ resolver: zodResolver(educationSchema), defaultValues: defaults });

  function onValid() {
    setError(null);
    startTransition(async () => {
      const result = await saveEducation(getValues());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.saved);
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4" noValidate>
      <Field id="edu-institution" label={s.education.institution} error={errors.institution?.message}>
        <Input
          id="edu-institution"
          className="h-11 text-base"
          aria-invalid={Boolean(errors.institution)}
          {...register("institution")}
        />
      </Field>
      <Field id="edu-degree" label={s.education.degree} error={errors.degree?.message}>
        <Input id="edu-degree" className="h-11 text-base" aria-invalid={Boolean(errors.degree)} {...register("degree")} />
      </Field>
      <Field id="edu-field" label={s.education.field} error={errors.field?.message}>
        <Input id="edu-field" className="h-11 text-base" {...register("field")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="edu-start" label={s.education.startYear} error={errors.startYear?.message}>
          <Input
            id="edu-start"
            inputMode="numeric"
            maxLength={4}
            placeholder="2019"
            className="h-11 text-base"
            aria-invalid={Boolean(errors.startYear)}
            {...register("startYear")}
          />
        </Field>
        <Field id="edu-end" label={s.education.endYear} error={errors.endYear?.message}>
          <Input
            id="edu-end"
            inputMode="numeric"
            maxLength={4}
            placeholder="2023"
            className="h-11 text-base"
            aria-invalid={Boolean(errors.endYear)}
            {...register("endYear")}
          />
        </Field>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="h-11 flex-1" onClick={onDone}>
          {s.cancel}
        </Button>
        <Button type="submit" className="h-11 flex-1" disabled={pending}>
          {pending ? s.saving : s.save}
        </Button>
      </div>
    </form>
  );
}
