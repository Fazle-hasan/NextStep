import type { Metadata } from "next";

import { requireViewer } from "@/features/auth/queries";
import { MapExplorer } from "@/features/places/map/components/MapExplorer";
import { getMapCities, getRelocationWorkplace, placesInView, searchFlatsNear } from "@/features/places/map/queries";
import { boundsAround, parseMapSearch } from "@/features/places/map/schemas";
import { mapPageStrings as s } from "@/features/places/map/strings";

export const metadata: Metadata = { title: s.title };

// Flats (approximate points), masjids, imambargahs, other places and the viewer's workplace on one map,
// with a results list. Signed-in only: flats are not public (D-012).
export default async function MapPage({ searchParams }: PageProps<"/map">) {
  const [params, viewer] = await Promise.all([searchParams, requireViewer("/map")]);
  const filters = parseMapSearch(params, viewer.profile.city_id);

  const [cities, relocationWorkplace, initialFlats] = await Promise.all([
    getMapCities(),
    getRelocationWorkplace(viewer.id),
    searchFlatsNear(filters, null),
  ]);

  // Places around the starting point, shown until the map reports its real viewport.
  const start = cities.find((c) => c.id === filters.cityId)?.center ?? filters.workplace;
  const initialPlaces = start ? await placesInView(boundsAround(start), filters.placeTypes) : [];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{s.title}</h1>
        <p className="text-muted-foreground">{s.intro}</p>
      </header>
      <MapExplorer
        cities={cities}
        filters={filters}
        initialFlats={initialFlats}
        initialPlaces={initialPlaces}
        relocationWorkplace={relocationWorkplace}
      />
    </div>
  );
}
