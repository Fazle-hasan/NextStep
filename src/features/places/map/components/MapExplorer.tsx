"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/features/jobs/search/components/EmptyState";
import { isMapConfigured, MapView, type MapBounds, type MapMarker, type MapPoint } from "@/lib/maps";
import { formatMonthlyRent } from "@/lib/utils/money";

import { PLACE_TYPE_LABELS, placeMarkerKind } from "../../labels";
import { loadMapFlats } from "../actions";
import { mapHref, type MapFilters } from "../schemas";
import { mapPageStrings as s } from "../strings";
import type { FlatResults, MapCity, MapPlace } from "../types";
import { useViewportPlaces } from "../useViewportPlaces";

import { flatCardId, MapFlatCard } from "./MapFlatCard";
import { MapFiltersPanel } from "./MapFiltersPanel";
import { MapLegend } from "./MapLegend";
import { SelectedPlaceCard } from "./SelectedPlaceCard";

type Props = {
  cities: MapCity[];
  // Applied filters, parsed from the URL by the page.
  filters: MapFilters;
  // Flats for those filters (no viewport limit), loaded on the server.
  initialFlats: FlatResults;
  initialPlaces: MapPlace[];
  relocationWorkplace: MapPoint | null;
};

// The map, its filters and the results list, kept in sync.
export function MapExplorer({ cities, filters, initialFlats, initialPlaces, relocationWorkplace }: Props) {
  const router = useRouter();
  const filterKey = mapHref(filters);
  const mapAvailable = isMapConfigured();
  const [navigating, startNavigation] = useTransition();
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [selectedFlat, setSelectedFlat] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<string | null>(null);
  // Results of "Search this area", kept only while the filters stay the same.
  const [area, setArea] = useState<{ filterKey: string; results: FlatResults } | null>(null);
  const [areaPending, setAreaPending] = useState(false);
  const [areaError, setAreaError] = useState<string | null>(null);

  const places = useViewportPlaces(initialPlaces, bounds, filters.placeTypes);
  const areaResults = area && area.filterKey === filterKey ? area.results : null;
  const { flats, total } = areaResults ?? initialFlats;
  const cityCenter = cities.find((c) => c.id === filters.cityId)?.center ?? null;
  const center = cityCenter ?? filters.workplace ?? undefined;

  const markers = useMemo<MapMarker[]>(() => {
    const list: MapMarker[] = [];
    for (const place of places) {
      list.push({
        id: `place:${place.id}`,
        kind: placeMarkerKind(place.place_type),
        lat: place.lat,
        lng: place.lng,
        label: s.place.markerLabel(PLACE_TYPE_LABELS[place.place_type], place.name),
      });
    }
    for (const flat of flats) {
      list.push({
        id: `flat:${flat.id}`,
        kind: "flat",
        lat: flat.approx_lat,
        lng: flat.approx_lng,
        label: s.results.markerLabel(flat.title, formatMonthlyRent(flat.rent)),
      });
    }
    if (filters.workplace) list.push({ id: "workplace", kind: "workplace", ...filters.workplace, label: s.place.workplaceMarker });
    return list;
  }, [places, flats, filters.workplace]);

  const onMarkerClick = useCallback((id: string) => {
    if (id.startsWith("flat:")) {
      const flatId = id.slice(5);
      setSelectedFlat(flatId);
      setSelectedPlace(null);
      document.getElementById(flatCardId(flatId))?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else if (id.startsWith("place:")) {
      setSelectedPlace(id.slice(6));
    }
  }, []);

  function applyFilters(next: MapFilters) {
    setSelectedFlat(null);
    setAreaError(null);
    startNavigation(() => router.replace(mapHref(next), { scroll: false }));
  }

  async function searchThisArea() {
    if (!bounds) return;
    setAreaPending(true);
    setAreaError(null);
    const result = await loadMapFlats({ filters, bounds });
    setAreaPending(false);
    if (result.ok) setArea({ filterKey, results: result.data });
    else setAreaError(result.error);
  }

  const shownPlace = selectedPlace ? places.find((p) => p.id === selectedPlace) : undefined;
  const selectedMarker = selectedFlat ? `flat:${selectedFlat}` : selectedPlace ? `place:${selectedPlace}` : null;

  return (
    <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
      <MapFiltersPanel
        key={filterKey}
        cities={cities}
        filters={filters}
        relocationWorkplace={relocationWorkplace}
        pending={navigating}
        onApply={applyFilters}
      />

      <div className="min-w-0 space-y-4">
        <MapView
          markers={markers}
          center={center}
          zoom={12}
          selectedId={selectedMarker}
          onMarkerClick={onMarkerClick}
          onBoundsChange={setBounds}
          ariaLabel={s.mapLabel}
          className={mapAvailable ? "h-[45vh] md:h-[60vh]" : undefined}
        />
        {mapAvailable && <MapLegend />}
        <p className="text-sm text-muted-foreground">{s.approxNote}</p>
        {shownPlace && <SelectedPlaceCard place={shownPlace} onClose={() => setSelectedPlace(null)} />}

        <section aria-labelledby="map-results" aria-busy={navigating || areaPending} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="map-results" className="text-lg font-semibold">
                {s.results.heading}
              </h2>
              <p role="status" className="text-sm text-muted-foreground">
                {navigating ? s.results.loading : areaResults ? s.results.areaActive : s.results.count(flats.length, total)}
              </p>
            </div>
            {mapAvailable && bounds && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="h-11" disabled={areaPending} onClick={searchThisArea}>
                  {areaPending ? s.results.searchingArea : s.results.searchArea}
                </Button>
                {areaResults && (
                  <Button type="button" variant="ghost" className="h-11" onClick={() => setArea(null)}>
                    {s.results.clearArea}
                  </Button>
                )}
              </div>
            )}
          </div>
          {areaError && (
            <p role="alert" className="text-sm text-destructive">
              {areaError}
            </p>
          )}
          {flats.length === 0 ? (
            <EmptyState title={s.results.emptyTitle} body={s.results.emptyBody} />
          ) : (
            <ul className="grid gap-3 lg:grid-cols-2">
              {flats.map((flat) => (
                <MapFlatCard key={flat.id} flat={flat} selected={flat.id === selectedFlat} onSelect={setSelectedFlat} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
