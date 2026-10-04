"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/profiles/components/Field";
import { NativeSelect } from "@/features/profiles/seeker/components/NativeSelect";
import { SwitchRow } from "@/features/profiles/seeker/components/SwitchRow";

import { PLACE_TYPE_LABELS } from "../../labels";
import { savePlace } from "../actions";
import { PLACE_TYPES, placeFormSchema, type PlaceFormInput, type PlaceFormValues } from "../schemas";
import { placesAdminStrings } from "../strings";
import type { AreaCentre, CityCentre } from "../types";
import { PlaceLocationField } from "./PlaceLocationField";

const s = placesAdminStrings;

type Props = { initial: PlaceFormInput; cities: CityCentre[]; areas: AreaCentre[] };

// Add or edit a place. The location is required (map pin or typed coordinates).
export function PlaceForm({ initial, cities, areas }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<PlaceFormInput, unknown, PlaceFormValues>({
    resolver: zodResolver(placeFormSchema),
    defaultValues: initial,
  });
  const { register, control, setValue, formState } = form;
  const e = formState.errors;
  const cityId = useWatch({ control, name: "cityId" });
  const neighbourhoodId = useWatch({ control, name: "neighbourhoodId" });
  const lat = useWatch({ control, name: "lat" });
  const lng = useWatch({ control, name: "lng" });
  const isVerified = useWatch({ control, name: "isVerified" });

  const cityAreas = areas.filter((area) => area.cityId === cityId);
  const centre =
    areas.find((area) => area.id === neighbourhoodId)?.centre ?? cities.find((city) => city.id === cityId)?.centre ?? undefined;

  function onSubmit(values: PlaceFormValues) {
    setSubmitError(null);
    startTransition(async () => {
      // The action re-validates the raw form shape, so send strings for the coordinates.
      const result = await savePlace({ ...form.getValues(), lat: String(values.lat), lng: String(values.lng) });
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      toast.success(s.saved);
      if (initial.id) router.refresh();
      else router.replace(`/admin/places/${result.data.id}`);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
      <Field id="place-name" label={s.form.name} error={e.name?.message}>
        <Input id="place-name" maxLength={150} className="h-11" aria-invalid={Boolean(e.name)} {...register("name")} />
      </Field>
      <Field id="place-type" label={s.form.type} error={e.placeType?.message}>
        <NativeSelect id="place-type" {...register("placeType")}>
          {PLACE_TYPES.map((type) => (
            <option key={type} value={type}>
              {PLACE_TYPE_LABELS[type]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="place-city" label={s.form.city} error={e.cityId?.message}>
          <NativeSelect
            id="place-city"
            aria-invalid={Boolean(e.cityId)}
            {...register("cityId", { onChange: () => setValue("neighbourhoodId", "") })}
          >
            <option value="">{s.form.chooseCity}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="place-area" label={s.form.area} error={e.neighbourhoodId?.message}>
          <NativeSelect id="place-area" {...register("neighbourhoodId")}>
            <option value="">{s.form.noArea}</option>
            {cityAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field id="place-address" label={s.form.address} error={e.address?.message}>
        <Input id="place-address" maxLength={300} className="h-11" {...register("address")} />
      </Field>
      <PlaceLocationField
        lat={lat}
        lng={lng}
        initialCenter={centre}
        error={e.lat?.message ?? e.lng?.message}
        onChange={(nextLat, nextLng) => {
          setValue("lat", nextLat, { shouldDirty: true });
          setValue("lng", nextLng, { shouldDirty: true });
        }}
      />
      <Field id="place-timings" label={s.form.timings} hint={s.form.timingsHint} error={e.timings?.message}>
        <Textarea id="place-timings" rows={3} maxLength={1000} {...register("timings")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="place-phone" label={s.form.phone} error={e.phone?.message}>
          <Input id="place-phone" type="tel" maxLength={30} className="h-11" aria-invalid={Boolean(e.phone)} {...register("phone")} />
        </Field>
        <Field id="place-website" label={s.form.website} hint={s.form.websiteHint} error={e.website?.message}>
          <Input id="place-website" type="url" maxLength={300} className="h-11" aria-invalid={Boolean(e.website)} {...register("website")} />
        </Field>
      </div>
      <Field id="place-notes" label={s.form.notes} error={e.notes?.message}>
        <Textarea id="place-notes" rows={3} maxLength={2000} {...register("notes")} />
      </Field>
      <SwitchRow
        id="place-verified"
        label={s.form.verified}
        hint={s.form.verifiedHint}
        checked={isVerified}
        onCheckedChange={(checked) => setValue("isVerified", checked, { shouldDirty: true })}
      />
      {submitError && (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      )}
      <Button type="submit" className="h-11 w-full sm:w-auto" disabled={pending}>
        {pending ? s.working : s.form.save}
      </Button>
    </form>
  );
}
