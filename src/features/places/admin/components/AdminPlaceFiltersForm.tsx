import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/features/profiles/components/Field";
import { NativeSelect } from "@/features/profiles/seeker/components/NativeSelect";

import { PLACE_TYPE_LABELS } from "../../labels";
import { PLACE_STATES, PLACE_TYPES, type AdminPlaceFilters } from "../schemas";
import { placesAdminStrings } from "../strings";
import type { CityCentre } from "../types";

const s = placesAdminStrings;

const STATE_LABELS: Record<(typeof PLACE_STATES)[number], string> = {
  verified: s.places.verified,
  unverified: s.places.unverified,
  hidden: s.places.hidden,
};

type Props = { filters: AdminPlaceFilters; cities: CityCentre[] };

// A plain GET form, so the filters live in the URL.
export function AdminPlaceFiltersForm({ filters, cities }: Props) {
  return (
    <form action="/admin/places" method="get" aria-label={s.filters.heading} className="space-y-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="admin-place-q" label={s.filters.search}>
          <Input id="admin-place-q" name="q" type="search" maxLength={80} defaultValue={filters.q ?? ""} className="h-11" />
        </Field>
        <Field id="admin-place-city" label={s.filters.city}>
          <NativeSelect id="admin-place-city" name="city" defaultValue={filters.city ?? ""}>
            <option value="">{s.filters.anyCity}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="admin-place-type" label={s.filters.type}>
          <NativeSelect id="admin-place-type" name="type" defaultValue={filters.type ?? ""}>
            <option value="">{s.filters.anyType}</option>
            {PLACE_TYPES.map((type) => (
              <option key={type} value={type}>
                {PLACE_TYPE_LABELS[type]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="admin-place-state" label={s.filters.state}>
          <NativeSelect id="admin-place-state" name="state" defaultValue={filters.state ?? ""}>
            <option value="">{s.filters.anyState}</option>
            {PLACE_STATES.map((state) => (
              <option key={state} value={state}>
                {STATE_LABELS[state]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="h-11">
          {s.filters.apply}
        </Button>
        <Button asChild variant="outline" className="h-11">
          <Link href="/admin/places">{s.filters.clear}</Link>
        </Button>
      </div>
    </form>
  );
}
