import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { PLACE_TYPE_LABELS } from "@/features/places/labels";
import { formatDistance } from "@/lib/maps";

import type { NearbyPlace } from "../types";

type Props = { places: NearbyPlace[]; emptyText: string };

// Verified places near the neighbourhood centre, nearest first.
export function NearbyPlaceList({ places, emptyText }: Props) {
  if (places.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;

  return (
    <ul className="divide-y rounded-xl border">
      {places.map((place) => (
        <li key={place.id}>
          <Link
            href={`/places/${place.id}`}
            className="flex items-start justify-between gap-3 p-3 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="min-w-0 space-y-1">
              <span className="block font-medium break-words">{place.name}</span>
              <Badge variant="secondary">{PLACE_TYPE_LABELS[place.placeType]}</Badge>
              {place.address && <span className="block text-sm break-words text-muted-foreground">{place.address}</span>}
              {place.timings && <span className="block text-sm break-words text-muted-foreground">{place.timings}</span>}
            </span>
            <span className="shrink-0 text-sm text-muted-foreground">{formatDistance(place.distanceM)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
