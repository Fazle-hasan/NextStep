import { MapIcon, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/features/jobs/search/components/EmptyState";
import { PageFrame } from "@/features/jobs/search/components/PageFrame";
import { getPublicPageViewer } from "@/features/jobs/search/viewer";
import { PlaceCard } from "@/features/places/directory/components/PlaceCard";
import { PlaceFiltersForm } from "@/features/places/directory/components/PlaceFiltersForm";
import { PlacesPagination } from "@/features/places/directory/components/PlacesPagination";
import { getAreaOptions, searchPlaces } from "@/features/places/directory/queries";
import { hasPlaceFilters, parsePlaceSearch } from "@/features/places/directory/schemas";
import { placesStrings as s } from "@/features/places/directory/strings";
import { getActiveCities } from "@/features/profiles/queries";

export const metadata: Metadata = { title: s.title, description: s.subtitle };

// Public directory of verified places (D-012). Shia masjids and imambargahs are listed first.
export default async function PlacesPage({ searchParams }: PageProps<"/places">) {
  const { filters, page } = parsePlaceSearch(await searchParams);
  const [{ viewer, inShell }, cities, areas, { places, total }] = await Promise.all([
    getPublicPageViewer(),
    getActiveCities(),
    getAreaOptions(),
    searchPlaces(filters, page),
  ]);
  const filtered = hasPlaceFilters(filters);

  return (
    <PageFrame inShell={inShell} className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{s.title}</h1>
          <p className="text-muted-foreground">{s.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-11">
            <Link href="/map">
              <MapIcon aria-hidden="true" />
              {s.openMap}
            </Link>
          </Button>
          {viewer && (
            <Button asChild className="h-11">
              <Link href="/places/suggest">
                <Plus aria-hidden="true" />
                {s.suggest}
              </Link>
            </Button>
          )}
        </div>
      </header>

      {/* The key resets the uncontrolled inputs when the URL filters change (e.g. "Clear filters"). */}
      <PlaceFiltersForm key={JSON.stringify(filters)} filters={filters} cities={cities} areas={areas} />

      <section aria-labelledby="places-results" className="space-y-4">
        <h2 id="places-results" className="text-base font-medium" aria-live="polite">
          {s.results(total)}
        </h2>

        {places.length === 0 ? (
          <EmptyState title={s.emptyTitle} body={filtered ? s.emptyBody : s.emptyNoFilters}>
            {filtered && (
              <Button asChild variant="outline" className="h-11">
                <Link href="/places">{s.filters.clear}</Link>
              </Button>
            )}
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {places.map((place) => (
              <li key={place.id}>
                <PlaceCard place={place} />
              </li>
            ))}
          </ul>
        )}

        <PlacesPagination filters={filters} page={page} total={total} />
      </section>
    </PageFrame>
  );
}
