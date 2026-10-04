import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireViewer } from "@/features/auth/queries";
import { getNeighbourhoods } from "@/features/jobs/queries";
import { EmptyState } from "@/features/jobs/search/components/EmptyState";
import { getActiveCities } from "@/features/profiles/queries";
import { FlatCard } from "@/features/settle-in/flats/components/FlatCard";
import { FlatFiltersForm } from "@/features/settle-in/flats/components/FlatFiltersForm";
import { FlatsPagination } from "@/features/settle-in/flats/components/FlatsPagination";
import { searchFlats } from "@/features/settle-in/flats/queries";
import { countActiveFilters, parseFlatSearch } from "@/features/settle-in/flats/schemas";
import { flatsStrings } from "@/features/settle-in/flats/strings";

const s = flatsStrings.search;

export const metadata: Metadata = { title: s.title };

export default async function FlatsPage({ searchParams }: PageProps<"/flats">) {
  await requireViewer("/flats");
  const { filters, page } = parseFlatSearch(await searchParams);
  const [cities, neighbourhoods, { flats, total }] = await Promise.all([
    getActiveCities(),
    getNeighbourhoods(),
    searchFlats(filters, page),
  ]);

  const cityNames = new Map(cities.map((city) => [city.id, city.name]));
  const areaNames = new Map(neighbourhoods.map((area) => [area.id, area.name]));
  const hasFilters = countActiveFilters(filters) > 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{s.title}</h1>
          <p className="text-muted-foreground">{s.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="h-11">
            <Link href="/flats/new">{s.listYours}</Link>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <Link href="/flats/mine">{s.myListings}</Link>
          </Button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
        <aside aria-label={s.filters}>
          {/* The key resets the uncontrolled inputs when the URL filters change (e.g. "Clear filters"). */}
          <FlatFiltersForm key={JSON.stringify(filters)} filters={filters} cities={cities} neighbourhoods={neighbourhoods} />
        </aside>

        <section aria-labelledby="results-heading" className="min-w-0 space-y-4">
          <h2 id="results-heading" className="text-base font-medium" aria-live="polite">
            {s.results(total)}
          </h2>

          {flats.length === 0 ? (
            <EmptyState title={s.emptyTitle} body={hasFilters ? s.emptyBody : s.emptyNoFilters} />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {flats.map((flat) => (
                <li key={flat.id}>
                  <FlatCard
                    flat={flat}
                    place={
                      [flat.neighbourhood_id ? areaNames.get(flat.neighbourhood_id) : null, cityNames.get(flat.city_id)]
                        .filter(Boolean)
                        .join(", ") || null
                    }
                  />
                </li>
              ))}
            </ul>
          )}

          <FlatsPagination filters={filters} page={page} total={total} />
        </section>
      </div>
    </div>
  );
}
