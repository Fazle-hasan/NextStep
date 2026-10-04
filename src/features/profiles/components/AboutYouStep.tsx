"use client";

import { Controller, useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { CityOption } from "../queries";
import { GENDERS, type OnboardingInput } from "../schemas";
import { onboardingStrings as s } from "../strings";

import { Field } from "./Field";

type Props = { cities: CityOption[]; genderLocked: boolean; needsPhone: boolean };

export function AboutYouStep({ cities, genderLocked, needsPhone }: Props) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<OnboardingInput>();

  return (
    <div className="space-y-5">
      <Field id="fullName" label={s.fullName} error={errors.fullName?.message}>
        <Input
          id="fullName"
          autoComplete="name"
          className="h-11 text-base"
          aria-invalid={Boolean(errors.fullName)}
          {...register("fullName")}
        />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{s.gender}</legend>
        <Controller
          control={control}
          name="gender"
          render={({ field }) => (
            <RadioGroup
              value={field.value ?? ""}
              onValueChange={field.onChange}
              disabled={genderLocked}
              className="flex gap-6"
              aria-invalid={Boolean(errors.gender)}
            >
              {GENDERS.map((g) => (
                <div key={g} className="flex min-h-11 items-center gap-2">
                  <RadioGroupItem id={`gender-${g}`} value={g} />
                  <Label htmlFor={`gender-${g}`} className="font-normal">
                    {g === "male" ? s.male : s.female}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        />
        <p className="text-sm text-muted-foreground">{genderLocked ? s.genderLocked : s.genderHint}</p>
        {errors.gender && (
          <p role="alert" className="text-sm text-destructive">
            {errors.gender.message}
          </p>
        )}
      </fieldset>

      <Field id="cityId" label={s.city} error={errors.cityId?.message}>
        <Controller
          control={control}
          name="cityId"
          render={({ field }) => (
            <Select value={field.value || undefined} onValueChange={field.onChange}>
              <SelectTrigger id="cityId" className="h-11 w-full text-base" aria-invalid={Boolean(errors.cityId)}>
                <SelectValue placeholder={s.cityPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      {needsPhone && (
        <Field id="phone" label={s.phone} hint={s.phoneHint} error={errors.phone?.message}>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="98765 43210"
            className="h-11 text-base"
            aria-invalid={Boolean(errors.phone)}
            {...register("phone")}
          />
        </Field>
      )}
    </div>
  );
}
