import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { isoDaysAgo, PRESET_DAYS, type AnalyticsFilters } from "../schemas";
import { analyticsStrings as s } from "../strings";

type Props = {
  filters: AnalyticsFilters;
  // The range actually used (the RPC fills in defaults).
  from: string;
  to: string;
  cities: { id: string; name: string }[];
};

function presetHref(days: number, city: string | undefined): string {
  const params = new URLSearchParams({ from: isoDaysAgo(days - 1), to: isoDaysAgo(0) });
  if (city) params.set("city", city);
  return `/admin/analytics?${params.toString()}`;
}

// Plain GET form so the range lives in the URL and works without JavaScript.
export function AnalyticsFiltersForm({ filters, from, to, cities }: Props) {
  return (
    <form method="get" className="space-y-4 rounded-xl border p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="analytics-from">{s.from}</Label>
          <Input id="analytics-from" type="date" name="from" defaultValue={from} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="analytics-to">{s.to}</Label>
          <Input id="analytics-to" type="date" name="to" defaultValue={to} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="analytics-city">{s.city}</Label>
          <select
            id="analytics-city"
            name="city"
            defaultValue={filters.city ?? ""}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{s.allCities}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label={s.presets} className="flex flex-wrap gap-2">
          {PRESET_DAYS.map((days) => (
            <Button key={days} asChild variant="outline" size="sm" className="h-9">
              <Link href={presetHref(days, filters.city)}>{s.preset(days)}</Link>
            </Button>
          ))}
        </nav>
        <Button type="submit" className="h-11">
          {s.apply}
        </Button>
      </div>
    </form>
  );
}
