import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CityOption } from "@/features/profiles/queries";

import { EXPERIENCE_LEVEL_LABELS, JOB_TYPE_LABELS, WORK_MODE_LABELS } from "../../labels";
import { countActiveFilters, POSTED_OPTIONS, type JobFilters } from "../schemas";
import { searchStrings as s } from "../strings";

import { FilterDisclosure } from "./FilterDisclosure";
import { NearMeFields } from "./NearMeFields";

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Props = { filters: JobFilters; cities: CityOption[] };

// A plain GET form: filters live in the URL, so searches can be shared, saved and work without JavaScript.
export function JobFiltersForm({ filters, cities }: Props) {
  const activeCount = countActiveFilters(filters);

  return (
    <form action="/jobs" method="get" role="search" className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="q">{s.keywordLabel}</Label>
        <div className="flex gap-2">
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={filters.q ?? ""}
            placeholder={s.keywordPlaceholder}
            maxLength={100}
            className="h-11 text-base"
          />
          <Button type="submit" className="h-11 px-4">
            {s.search}
          </Button>
        </div>
      </div>

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

        <NearMeFields lat={filters.lat} lng={filters.lng} radius={filters.radius} />

        <CheckboxGroup legend={s.jobType} name="types" options={JOB_TYPE_LABELS} selected={filters.types} />
        <CheckboxGroup legend={s.workMode} name="modes" options={WORK_MODE_LABELS} selected={filters.modes} />
        <CheckboxGroup legend={s.level} name="levels" options={EXPERIENCE_LEVEL_LABELS} selected={filters.levels} />

        <div className="space-y-2">
          <Label htmlFor="minSalary">{s.minSalary}</Label>
          <Input
            id="minSalary"
            name="minSalary"
            type="number"
            inputMode="decimal"
            min={0}
            max={1000}
            step="0.5"
            defaultValue={filters.minSalary ?? ""}
            aria-describedby="minSalary-hint"
            className="h-11 text-base"
          />
          <p id="minSalary-hint" className="text-sm text-muted-foreground">
            {s.minSalaryHint}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="posted">{s.posted}</Label>
          <select id="posted" name="posted" defaultValue={filters.posted ? String(filters.posted) : ""} className={selectClass}>
            <option value="">{s.postedAny}</option>
            {POSTED_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {s.postedOptions[days]}
              </option>
            ))}
          </select>
        </div>

        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name="leap" value="1" defaultChecked={filters.leap} className="size-5 accent-primary" />
          {s.leapOnly}
        </label>

        <div className="flex gap-2">
          <Button type="submit" className="h-11 flex-1">
            {s.applyFilters}
          </Button>
          {(activeCount > 0 || filters.q) && (
            <Button asChild variant="outline" className="h-11">
              <Link href="/jobs">{s.clear}</Link>
            </Button>
          )}
        </div>
      </FilterDisclosure>
    </form>
  );
}

function CheckboxGroup<T extends string>({
  legend,
  name,
  options,
  selected,
}: {
  legend: string;
  name: string;
  options: Record<T, string>;
  selected: readonly T[];
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      {(Object.entries(options) as [T, string][]).map(([value, label]) => (
        <label key={value} className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            name={name}
            value={value}
            defaultChecked={selected.includes(value)}
            className="size-5 accent-primary"
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}
