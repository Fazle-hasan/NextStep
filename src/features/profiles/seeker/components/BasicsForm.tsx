"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EXPERIENCE_LEVEL_LABELS, WORK_MODE_LABELS } from "@/features/jobs/labels";
import { Field } from "@/features/profiles/components/Field";
import type { CityOption } from "@/features/profiles/queries";

import { saveBasics } from "../actions";
import { basicsSchema, EXPERIENCE_LEVELS, WORK_MODES, type BasicsInput, type BasicsValues } from "../schemas";
import { seekerStrings as s } from "../strings";

import { NativeSelect } from "./NativeSelect";
import { SwitchRow } from "./SwitchRow";

type Props = { defaults: BasicsInput; cities: CityOption[] };

export function BasicsForm({ defaults, cities }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    control,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<BasicsInput, unknown, BasicsValues>({ resolver: zodResolver(basicsSchema), defaultValues: defaults });

  // The server action validates the raw form values again with the same schema.
  function onValid() {
    setError(null);
    startTransition(async () => {
      const result = await saveBasics(getValues());
      if (result.ok) toast.success(s.saved);
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-5" noValidate>
      <Field id="headline" label={s.basics.headline} hint={s.basics.headlineHint} error={errors.headline?.message}>
        <Input id="headline" className="h-11 text-base" aria-invalid={Boolean(errors.headline)} {...register("headline")} />
      </Field>
      <Field id="summary" label={s.basics.summary} hint={s.basics.summaryHint} error={errors.summary?.message}>
        <Textarea id="summary" rows={4} className="text-base" aria-invalid={Boolean(errors.summary)} {...register("summary")} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="experienceLevel" label={s.basics.experienceLevel} error={errors.experienceLevel?.message}>
          <NativeSelect id="experienceLevel" {...register("experienceLevel")}>
            <option value="">{s.notSet}</option>
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {EXPERIENCE_LEVEL_LABELS[level]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="workModePref" label={s.basics.workMode} error={errors.workModePref?.message}>
          <NativeSelect id="workModePref" {...register("workModePref")}>
            <option value="">{s.basics.noPreference}</option>
            {WORK_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {WORK_MODE_LABELS[mode]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{s.basics.cities}</legend>
        <Controller
          control={control}
          name="preferredCityIds"
          render={({ field }) => (
            <div className="grid gap-x-4 sm:grid-cols-2">
              {cities.map((city) => (
                <div key={city.id} className="flex min-h-11 items-center gap-3">
                  <Checkbox
                    id={`city-${city.id}`}
                    checked={field.value.includes(city.id)}
                    onCheckedChange={(checked) =>
                      field.onChange(checked ? [...field.value, city.id] : field.value.filter((id) => id !== city.id))
                    }
                  />
                  <Label htmlFor={`city-${city.id}`} className="font-normal">
                    {city.name}
                  </Label>
                </div>
              ))}
            </div>
          )}
        />
        {errors.preferredCityIds && (
          <p role="alert" className="text-sm text-destructive">
            {errors.preferredCityIds.message}
          </p>
        )}
      </fieldset>

      <Controller
        control={control}
        name="openToRelocate"
        render={({ field }) => (
          <SwitchRow id="openToRelocate" label={s.basics.relocate} checked={field.value} onCheckedChange={field.onChange} />
        )}
      />

      <Field id="languages" label={s.basics.languages} hint={s.basics.languagesHint} error={errors.languages?.message}>
        <Input id="languages" className="h-11 text-base" aria-invalid={Boolean(errors.languages)} {...register("languages")} />
      </Field>
      <Field id="linkedinUrl" label={s.basics.linkedin} hint={s.basics.linkHint} error={errors.linkedinUrl?.message}>
        <Input
          id="linkedinUrl"
          type="url"
          inputMode="url"
          placeholder="https://"
          className="h-11 text-base"
          aria-invalid={Boolean(errors.linkedinUrl)}
          {...register("linkedinUrl")}
        />
      </Field>
      <Field id="portfolioUrl" label={s.basics.portfolio} hint={s.basics.linkHint} error={errors.portfolioUrl?.message}>
        <Input
          id="portfolioUrl"
          type="url"
          inputMode="url"
          placeholder="https://"
          className="h-11 text-base"
          aria-invalid={Boolean(errors.portfolioUrl)}
          {...register("portfolioUrl")}
        />
      </Field>

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
