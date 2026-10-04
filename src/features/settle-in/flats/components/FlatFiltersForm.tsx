import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilterDisclosure } from "@/features/jobs/search/components/FilterDisclosure";
import type { NeighbourhoodOption } from "@/features/jobs/types";
import type { CityOption } from "@/features/profiles/queries";

import { FURNISHING_LABELS, LISTING_TYPE_LABELS } from "../labels";
import { countActiveFilters, FURNISHINGS, LISTING_TYPES, type FlatFilters } from "../schemas";
import { flatsStrings } from "../strings";

const s = flatsStrings.search;
const selectClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Props = { filters: FlatFilters; cities: CityOption[]; neighbourhoods: NeighbourhoodOption[] };

// A plain GET form: filters live in the URL, so a search can be shared and works without JavaScript.
export function FlatFiltersForm({ filters, cities, neighbourhoods }: Props) {
  const activeCount = countActiveFilters(filters);
  // Neighbourhoods of the chosen city (all of them, grouped by city, when no city is chosen).
  const areas = filters.city ? neighbourhoods.filter((n) => n.city_id === filters.city) : neighbourhoods;

  return (
    <form action="/flats" method="get" role="search" className="space-y-4">
      <FilterDisclosure activeCount={activeCount}>
        <div className="space-y-2">
          <Label htmlFor="city">{s.city}</Label>
          <select id="city" name="city" defaultValue={filters.city ?? ""} className={selectClass}>
            <option value="">{s.anyCity}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="area">{s.neighbourhood}</Label>
          <select id="area" name="area" defaultValue={filters.area ?? ""} className={selectClass}>
            <option value="">{s.anyNeighbourhood}</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="rentMin">{s.rentMin}</Label>
            <Input
              id="rentMin"
              name="rentMin"
              type="number"
              inputMode="numeric"
              min={1}
              step={500}
              defaultValue={filters.rentMin ?? ""}
              className="h-11 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rentMax">{s.rentMax}</Label>
            <Input
              id="rentMax"
              name="rentMax"
              type="number"
              inputMode="numeric"
              min={1}
              step={500}
              defaultValue={filters.rentMax ?? ""}
              className="h-11 text-base"
            />
          </div>
        </div>

        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">{s.listingType}</legend>
          {LISTING_TYPES.map((type) => (
            <label key={type} className="flex min-h-11 items-center gap-3 text-base">
              <input
                type="checkbox"
                name="types"
                value={type}
                defaultChecked={filters.types.includes(type)}
                className="size-5 accent-primary"
              />
              {LISTING_TYPE_LABELS[type]}
            </label>
          ))}
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="furnishing">{s.furnishing}</Label>
          <select id="furnishing" name="furnishing" defaultValue={filters.furnishing ?? ""} className={selectClass}>
            <option value="">{s.anyFurnishing}</option>
            {FURNISHINGS.map((value) => (
              <option key={value} value={value}>
                {FURNISHING_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="h-11 flex-1">
            {s.apply}
          </Button>
          {activeCount > 0 && (
            <Button asChild variant="ghost" className="h-11">
              <Link href="/flats">{s.clear}</Link>
            </Button>
          )}
        </div>
      </FilterDisclosure>
    </form>
  );
}
