"use client";

import { useFormContext, useWatch } from "react-hook-form";

import { Input } from "@/components/ui/input";
import type { NeighbourhoodOption } from "@/features/jobs/types";
import { useAreaCentre } from "@/features/places/map/useAreaCentre";
import { Field } from "@/features/profiles/components/Field";
import type { CityOption } from "@/features/profiles/queries";
import { isMapConfigured, PinPicker, type MapPoint } from "@/lib/maps";

import type { JobFormInput } from "../schemas";
import { employerStrings } from "../strings";

import { SelectField } from "./SelectField";

const s = employerStrings.job;

type Props = { cities: CityOption[]; neighbourhoods: NeighbourhoodOption[] };

// City, neighbourhood, address and an optional map pin. Without a pin the map point is derived from the
// neighbourhood or city (D-029). Changing the city or neighbourhood clears the pin.
export function JobLocationFields({ cities, neighbourhoods }: Props) {
  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<JobFormInput>();
  const cityId = useWatch({ control, name: "cityId" });
  const workMode = useWatch({ control, name: "workMode" });
  const neighbourhoodId = useWatch({ control, name: "neighbourhoodId" });
  const lat = useWatch({ control, name: "locationLat" });
  const lng = useWatch({ control, name: "locationLng" });
  const hoods = neighbourhoods.filter((n) => n.city_id === cityId);
  const areaCentre = useAreaCentre(cityId, neighbourhoodId);
  const pin = lat != null && lng != null ? { lat, lng } : null;

  function setPin(point: MapPoint | null) {
    setValue("locationLat", point?.lat ?? null, { shouldDirty: true });
    setValue("locationLng", point?.lng ?? null, { shouldDirty: true });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField<JobFormInput>
          name="cityId"
          label={s.city}
          placeholder={employerStrings.locations.cityPlaceholder}
          hint={workMode === "remote" ? s.cityRemoteHint : undefined}
          emptyLabel={workMode === "remote" ? s.noNeighbourhood : undefined}
          options={cities.map((c) => ({ value: c.id, label: c.name }))}
          onValueChange={() => {
            setValue("neighbourhoodId", "");
            setPin(null);
          }}
        />
        <SelectField<JobFormInput>
          name="neighbourhoodId"
          label={s.neighbourhood}
          placeholder={s.neighbourhoodPlaceholder}
          emptyLabel={s.noNeighbourhood}
          disabled={!cityId || hoods.length === 0}
          onValueChange={() => setPin(null)}
          options={hoods.map((n) => ({ value: n.id, label: n.name }))}
        />
      </div>
      <Field id="addressText" label={s.address} hint={s.locationNote} error={errors.addressText?.message}>
        <Input id="addressText" className="h-11 text-base" maxLength={300} {...register("addressText")} />
      </Field>
      {cityId && isMapConfigured() && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{s.pinTitle}</legend>
          <PinPicker value={pin} onChange={setPin} initialCenter={areaCentre} ariaLabel={s.pinLabel} />
          <p className="text-sm text-muted-foreground">{s.pinHint}</p>
        </fieldset>
      )}
    </div>
  );
}
