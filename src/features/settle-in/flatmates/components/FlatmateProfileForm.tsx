"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/profiles/components/Field";
import type { CityOption } from "@/features/profiles/queries";
import { NativeSelect } from "@/features/profiles/seeker/components/NativeSelect";
import { SwitchRow } from "@/features/profiles/seeker/components/SwitchRow";

import { saveFlatmateProfile } from "../actions";
import { flatmateProfileSchema, type FlatmateProfileInput, type FlatmateProfileValues } from "../schemas";
import { flatmateStrings as s } from "../strings";
import type { NeighbourhoodOption } from "../types";

import { AreaPicker } from "./AreaPicker";
import { HabitsFields } from "./HabitsFields";

type Props = {
  defaults: FlatmateProfileInput;
  cities: CityOption[];
  neighbourhoods: NeighbourhoodOption[];
  // The viewer's own gender, from their account (read-only here).
  genderLabel: string | null;
};

export function FlatmateProfileForm({ defaults, cities, neighbourhoods, genderLabel }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    control,
    getValues,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FlatmateProfileInput, unknown, FlatmateProfileValues>({
    resolver: zodResolver(flatmateProfileSchema),
    defaultValues: defaults,
  });
  const p = s.profile;

  const cityId = useWatch({ control, name: "cityId" });
  const cityAreas = neighbourhoods.filter((area) => area.cityId === cityId);
  const cityField = register("cityId");

  // The server action validates the raw form values again with the same schema.
  function onValid() {
    setError(null);
    startTransition(async () => {
      const result = await saveFlatmateProfile(getValues());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.saved);
      router.push("/flatmates");
    });
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-5" noValidate>
      <div className="space-y-1">
        <p className="text-sm font-medium">{p.yourGender}</p>
        <p>{genderLabel ?? p.genderMissing}</p>
        <p className="text-sm text-muted-foreground">{p.yourGenderHint}</p>
      </div>

      <Field id="cityId" label={p.city} error={errors.cityId?.message}>
        <NativeSelect
          id="cityId"
          aria-invalid={Boolean(errors.cityId)}
          {...cityField}
          onChange={(event) => {
            void cityField.onChange(event);
            // Areas belong to one city, so a new city starts with none chosen.
            setValue("neighbourhoodIds", [], { shouldDirty: true });
          }}
        >
          <option value="">{p.chooseCity}</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      {cityId && (
        <Controller
          control={control}
          name="neighbourhoodIds"
          render={({ field }) => (
            <AreaPicker
              options={cityAreas}
              value={field.value}
              onChange={field.onChange}
              error={errors.neighbourhoodIds?.message}
            />
          )}
        />
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="budgetMin" label={p.budgetMin} error={errors.budgetMin?.message}>
          <Input
            id="budgetMin"
            inputMode="numeric"
            className="h-11 text-base"
            aria-invalid={Boolean(errors.budgetMin)}
            {...register("budgetMin")}
          />
        </Field>
        <Field id="budgetMax" label={p.budgetMax} error={errors.budgetMax?.message}>
          <Input
            id="budgetMax"
            inputMode="numeric"
            className="h-11 text-base"
            aria-invalid={Boolean(errors.budgetMax)}
            {...register("budgetMax")}
          />
        </Field>
      </div>

      <Field id="moveDate" label={p.moveDate} error={errors.moveDate?.message}>
        <Input
          id="moveDate"
          type="date"
          className="h-11 text-base"
          aria-invalid={Boolean(errors.moveDate)}
          {...register("moveDate")}
        />
      </Field>

      <HabitsFields register={register} control={control} errors={errors} />

      <Field id="bio" label={p.bio} hint={p.bioHint} error={errors.bio?.message}>
        <Textarea id="bio" rows={4} className="text-base" aria-invalid={Boolean(errors.bio)} {...register("bio")} />
      </Field>

      <Controller
        control={control}
        name="isActive"
        render={({ field }) => (
          <SwitchRow
            id="isActive"
            label={p.isActive}
            hint={s.mine.activeHint}
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
