import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { adminStrings } from "@/features/admin/strings";
import { PLACE_TYPE_LABELS } from "@/features/places/labels";
import { AdminPlaceFiltersForm } from "@/features/places/admin/components/AdminPlaceFiltersForm";
import { PlaceRowActions } from "@/features/places/admin/components/PlaceRowActions";
import { SuggestionCard } from "@/features/places/admin/components/SuggestionCard";
import { getAdminPlaces, getAreaCentres, getPendingSuggestions } from "@/features/places/admin/queries";
import { ADMIN_PAGE_SIZE, adminPlacesHref, parseAdminPlaceSearch } from "@/features/places/admin/schemas";
import { placesAdminStrings as s } from "@/features/places/admin/strings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: s.places.title };

const TABS = ["places", "suggestions"] as const;

export default async function AdminPlacesPage({ searchParams }: PageProps<"/admin/places">) {
  const params = await searchParams;
  const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab = rawTab === "suggestions" ? "suggestions" : "places";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Link href="/admin" className="text-sm text-primary hover:underline">
            ← {adminStrings.title}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{s.places.title}</h1>
          <p className="text-muted-foreground">{s.places.description}</p>
        </div>
        <Button asChild className="h-11">
          <Link href="/admin/places/new">{s.places.add}</Link>
        </Button>
      </div>

      <nav aria-label={s.places.title} className="flex gap-2">
        {TABS.map((item) => (
          <Link
            key={item}
            href={item === "places" ? "/admin/places" : "/admin/places?tab=suggestions"}
            aria-current={item === tab ? "page" : undefined}
            className={cn(
              "flex h-11 items-center rounded-lg border px-4 text-sm font-medium",
              item === tab ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {s.pages.tabs[item]}
          </Link>
        ))}
      </nav>

      {tab === "suggestions" ? <SuggestionsList /> : <PlacesList params={params} />}
    </div>
  );
}

async function SuggestionsList() {
  const suggestions = await getPendingSuggestions();
  if (suggestions.length === 0) {
    return <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">{s.suggestions.empty}</p>;
  }
  return (
    <section aria-labelledby="suggestions-heading" className="space-y-4">
      <h2 id="suggestions-heading" className="text-lg font-semibold">
        {s.suggestions.title}
      </h2>
      <ul className="space-y-4">
        {suggestions.map((suggestion) => (
          <li key={suggestion.id}>
            <SuggestionCard suggestion={suggestion} />
          </li>
        ))}
      </ul>
    </section>
  );
}

async function PlacesList({ params }: { params: Record<string, string | string[] | undefined> }) {
  const { filters, page } = parseAdminPlaceSearch(params);
  const [{ places, total }, { cities }] = await Promise.all([getAdminPlaces(filters, page), getAreaCentres()]);
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));

  return (
    <div className="space-y-4">
      <AdminPlaceFiltersForm filters={filters} cities={cities} />
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {s.places.count(total)}
      </p>

      {places.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">{s.places.empty}</p>
      ) : (
        <ul className="space-y-3">
          {places.map((place) => (
            <li key={place.id}>
              <Card>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/places/${place.id}`} className="font-medium hover:underline">
                        {place.name}
                      </Link>
                      {place.isVerified ? (
                        <StatusBadge tone="success" label={s.places.verified} />
                      ) : (
                        <StatusBadge tone="attention" label={s.places.unverified} />
                      )}
                      {place.isHidden && <StatusBadge tone="danger" label={s.places.hidden} />}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {[PLACE_TYPE_LABELS[place.placeType], place.areaName, place.cityName].filter(Boolean).join(" · ")}
                    </p>
                    {place.address && <p className="text-sm text-muted-foreground">{place.address}</p>}
                  </div>
                  <PlaceRowActions id={place.id} isVerified={place.isVerified} isHidden={place.isHidden} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav aria-label={s.places.page(page, pages)} className="flex items-center justify-between gap-2">
          {page > 1 ? (
            <Button asChild variant="outline" className="h-11">
              <Link href={adminPlacesHref(filters, page - 1)}>{s.places.previous}</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">{s.places.page(page, pages)}</span>
          {page < pages ? (
            <Button asChild variant="outline" className="h-11">
              <Link href={adminPlacesHref(filters, page + 1)}>{s.places.next}</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
