import Link from "next/link";

import { formatDistance } from "@/lib/maps/geo";

import { placesStrings } from "../strings";
import type { NearbyPlace } from "../types";

import { PlaceTypeBadge } from "./PlaceTypeBadge";

const s = placesStrings.detail;

// Other verified places within 2 km, nearest first.
export function NearbyPlaces({ places }: { places: NearbyPlace[] }) {
  return (
    <section aria-labelledby="nearby-places" className="space-y-2">
      <h2 id="nearby-places" className="text-lg font-semibold">
        {s.nearby}
      </h2>
      {places.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.nearbyEmpty}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {places.map((place) => (
            <li key={place.id}>
              <Link
                href={`/places/${place.id}`}
                className="flex min-h-11 flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="min-w-0 space-y-1">
                  <span className="block font-medium break-words">{place.name}</span>
                  <PlaceTypeBadge type={place.placeType} />
                </span>
                <span className="shrink-0 text-sm text-muted-foreground">{s.away(formatDistance(place.distanceM))}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
