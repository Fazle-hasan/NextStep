"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/profiles/components/Field";

import { saveExperience } from "../actions";
import { experienceSchema, type ExperienceInput, type ExperienceValues } from "../schemas";
import { seekerStrings as s } from "../strings";

type Props = { defaults: ExperienceInput; onDone: () => void };

export function ExperienceForm({ defaults, onDone }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    control,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<ExperienceInput, unknown, ExperienceValues>({ resolver: zodResolver(experienceSchema), defaultValues: defaults });
  const isCurrent = useWatch({ control, name: "isCurrent" });

  function onValid() {
    setError(null);
    startTransition(async () => {
      const result = await saveExperience(getValues());
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
      <Field id="exp-title" label={s.experience.jobTitle} error={errors.title?.message}>
        <Input id="exp-title" className="h-11 text-base" aria-invalid={Boolean(errors.title)} {...register("title")} />
      </Field>
      <Field id="exp-company" label={s.experience.company} error={errors.companyName?.message}>
        <Input
          id="exp-company"
          autoComplete="organization"
          className="h-11 text-base"
          aria-invalid={Boolean(errors.companyName)}
          {...register("companyName")}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="exp-start" label={s.experience.start} error={errors.startDate?.message}>
          <Input
            id="exp-start"
            type="date"
            className="h-11 text-base"
            aria-invalid={Boolean(errors.startDate)}
            {...register("startDate")}
          />
        </Field>
        {!isCurrent && (
          <Field id="exp-end" label={s.experience.end} error={errors.endDate?.message}>
            <Input
              id="exp-end"
              type="date"
              className="h-11 text-base"
              aria-invalid={Boolean(errors.endDate)}
              {...register("endDate")}
            />
          </Field>
        )}
      </div>
      <Controller
        control={control}
        name="isCurrent"
        render={({ field }) => (
          <div className="flex min-h-11 items-center gap-3">
            <Checkbox id="exp-current" checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
            <Label htmlFor="exp-current" className="font-normal">
              {s.experience.current}
            </Label>
          </div>
        )}
      />
      <Field id="exp-description" label={s.experience.description} error={errors.description?.message}>
        <Textarea id="exp-description" rows={3} className="text-base" {...register("description")} />
      </Field>
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
