"use client";

import { useFormContext, useWatch } from "react-hook-form";

import { Input } from "@/components/ui/input";
import type { NeighbourhoodOption } from "@/features/jobs/types";
import { Field } from "@/features/profiles/components/Field";
import type { CityOption } from "@/features/profiles/queries";

import type { JobFormInput } from "../schemas";
import { employerStrings } from "../strings";

import { SelectField } from "./SelectField";

const s = employerStrings.job;

type Props = { cities: CityOption[]; neighbourhoods: NeighbourhoodOption[] };

// City, neighbourhood and address. The map point is derived from these until the maps module adds a pin picker.
export function JobLocationFields({ cities, neighbourhoods }: Props) {
  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<JobFormInput>();
  const cityId = useWatch({ control, name: "cityId" });
  const workMode = useWatch({ control, name: "workMode" });
  const hoods = neighbourhoods.filter((n) => n.city_id === cityId);

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
          onValueChange={() => setValue("neighbourhoodId", "")}
        />
        <SelectField<JobFormInput>
          name="neighbourhoodId"
          label={s.neighbourhood}
          placeholder={s.neighbourhoodPlaceholder}
          emptyLabel={s.noNeighbourhood}
          disabled={!cityId || hoods.length === 0}
          options={hoods.map((n) => ({ value: n.id, label: n.name }))}
        />
      </div>
      <Field id="addressText" label={s.address} hint={s.locationNote} error={errors.addressText?.message}>
        <Input id="addressText" className="h-11 text-base" maxLength={300} {...register("addressText")} />
      </Field>
    </div>
  );
}
