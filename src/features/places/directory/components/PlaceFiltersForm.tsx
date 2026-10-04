import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/features/profiles/components/Field";
import type { CityOption } from "@/features/profiles/queries";
import { NativeSelect } from "@/features/profiles/seeker/components/NativeSelect";

import { PLACE_TYPE_LABELS } from "../../labels";
import { hasPlaceFilters, PLACE_TYPES, type PlaceFilters } from "../schemas";
import { placesStrings } from "../strings";
import type { AreaOption } from "../types";

const s = placesStrings.filters;

type Props = { filters: PlaceFilters; cities: CityOption[]; areas: AreaOption[] };

// A plain GET form: filters live in the URL, so results can be shared and work without JavaScript.
// The area list shows the chosen city's areas (all areas, grouped by city, when no city is chosen).
export function PlaceFiltersForm({ filters, cities, areas }: Props) {
  const cityName = new Map(cities.map((city) => [city.id, city.name]));
  const shownAreas = filters.city ? areas.filter((area) => area.cityId === filters.city) : areas;

  return (
    <form action="/places" method="get" aria-label={s.heading} className="space-y-4 rounded-xl border p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field id="place-q" label={s.search}>
          <Input id="place-q" name="q" type="search" maxLength={80} defaultValue={filters.q ?? ""} placeholder={s.searchPlaceholder} className="h-11" />
        </Field>
        <Field id="place-type" label={s.type}>
          <NativeSelect id="place-type" name="type" defaultValue={filters.type ?? ""}>
            <option value="">{s.anyType}</option>
            {PLACE_TYPES.map((type) => (
              <option key={type} value={type}>
                {PLACE_TYPE_LABELS[type]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="place-city" label={s.city}>
          <NativeSelect id="place-city" name="city" defaultValue={filters.city ?? ""}>
            <option value="">{s.anyCity}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="place-area" label={s.area}>
          <NativeSelect id="place-area" name="area" defaultValue={filters.area ?? ""}>
            <option value="">{s.anyArea}</option>
            {shownAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {filters.city ? area.name : `${area.name} (${cityName.get(area.cityId) ?? ""})`}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="h-11 px-6">
          {s.apply}
        </Button>
        {hasPlaceFilters(filters) && (
          <Button asChild variant="outline" className="h-11">
            <Link href="/places">{s.clear}</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
