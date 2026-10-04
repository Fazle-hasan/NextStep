"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/profiles/components/Field";
import { NativeSelect } from "@/features/profiles/seeker/components/NativeSelect";

import { PLACE_TYPE_LABELS } from "../../labels";
import { submitPlaceSuggestion } from "../actions";
import { PLACE_TYPES, suggestionSchema, type SuggestionInput, type SuggestionValues } from "../schemas";
import { placesStrings } from "../strings";
import type { AreaOption, CityCentre } from "../types";

import { SuggestionLocationField } from "./SuggestionLocationField";

const s = placesStrings.suggestForm;

type Props = {
  defaults: SuggestionInput;
  cities: CityCentre[];
  areas: AreaOption[];
  // Where to go back to (the place being corrected, or the directory).
  cancelHref: string;
};

// A new place or a correction. Nothing changes in the directory until an admin reviews it.
export function SuggestionForm({ defaults, cities, areas, cancelHref }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    control,
    getValues,
    setValue,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<SuggestionInput, unknown, SuggestionValues>({
    resolver: zodResolver(suggestionSchema),
    defaultValues: defaults,
  });
  const isCorrection = Boolean(defaults.placeId);

  const cityId = useWatch({ control, name: "cityId" });
  const location = useWatch({ control, name: "location" });
  const cityAreas = areas.filter((area) => area.cityId === cityId);
  const cityCentre = cities.find((city) => city.id === cityId)?.centre ?? undefined;
  const cityField = register("cityId");

  // The server action validates the raw form values again with the same schema.
  function onValid() {
    setError(null);
    startTransition(async () => {
      const result = await submitPlaceSuggestion(getValues());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.sent);
      if (!isCorrection) reset(defaults);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-5" noValidate>
      <input type="hidden" {...register("placeId")} />

      <Field id="name" label={s.name} error={errors.name?.message}>
        <Input id="name" maxLength={150} aria-invalid={Boolean(errors.name)} className="h-11" {...register("name")} />
      </Field>

      <Field id="placeType" label={s.type} error={errors.placeType?.message}>
        <NativeSelect id="placeType" aria-invalid={Boolean(errors.placeType)} {...register("placeType")}>
          {PLACE_TYPES.map((type) => (
            <option key={type} value={type}>
              {PLACE_TYPE_LABELS[type]}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="cityId" label={s.city} error={errors.cityId?.message}>
          <NativeSelect
            id="cityId"
            aria-invalid={Boolean(errors.cityId)}
            {...cityField}
            onChange={(event) => {
              void cityField.onChange(event);
              // Areas belong to one city.
              setValue("neighbourhoodId", "");
            }}
          >
            <option value="">{s.chooseCity}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="neighbourhoodId" label={s.area} error={errors.neighbourhoodId?.message}>
          <NativeSelect id="neighbourhoodId" disabled={cityAreas.length === 0} {...register("neighbourhoodId")}>
            <option value="">{s.noArea}</option>
            {cityAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <Field id="address" label={s.address} error={errors.address?.message}>
        <Input id="address" maxLength={300} aria-invalid={Boolean(errors.address)} className="h-11" {...register("address")} />
      </Field>

      <Field id="timings" label={s.timings} hint={s.timingsHint} error={errors.timings?.message}>
        <Textarea id="timings" rows={3} maxLength={1000} aria-invalid={Boolean(errors.timings)} {...register("timings")} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="phone" label={s.phone} hint={s.phoneHint} error={errors.phone?.message}>
          <Input id="phone" type="tel" maxLength={30} aria-invalid={Boolean(errors.phone)} className="h-11" {...register("phone")} />
        </Field>
        <Field id="website" label={s.website} error={errors.website?.message}>
          <Input
            id="website"
            type="url"
            inputMode="url"
            maxLength={300}
            placeholder={s.websitePlaceholder}
            aria-invalid={Boolean(errors.website)}
            className="h-11"
            {...register("website")}
          />
        </Field>
      </div>

      <Field id="notes" label={s.notes} error={errors.notes?.message}>
        <Textarea id="notes" rows={3} maxLength={2000} aria-invalid={Boolean(errors.notes)} {...register("notes")} />
      </Field>

      <SuggestionLocationField
        value={location ?? null}
        initialCenter={cityCentre}
        onChange={(point) => setValue("location", point, { shouldDirty: true })}
      />

      <Field id="note" label={isCorrection ? s.noteCorrection : s.note} error={errors.note?.message}>
        <Textarea id="note" rows={3} maxLength={1000} aria-invalid={Boolean(errors.note)} {...register("note")} />
      </Field>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="h-11 px-6" disabled={pending}>
          {pending ? s.submitting : s.submit}
        </Button>
        <Button asChild variant="outline" className="h-11">
          <Link href={cancelHref}>{s.cancel}</Link>
        </Button>
      </div>
    </form>
  );
}
