import { BadgeCheck, Clock, MapPin } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { placesStrings as s } from "../strings";
import type { PlaceListItem } from "../types";

import { PlaceTypeBadge } from "./PlaceTypeBadge";

// One place in the directory list. The whole title is the link to the detail page.
export function PlaceCard({ place }: { place: PlaceListItem }) {
  const where = [place.areaName, place.cityName].filter(Boolean).join(", ");

  return (
    <Card className="h-full">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <PlaceTypeBadge type={place.placeType} />
          {place.isVerified && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <BadgeCheck className="size-4" aria-hidden="true" />
              {s.verified}
            </span>
          )}
        </div>
        <CardTitle className="text-base leading-snug">
          <Link
            href={`/places/${place.id}`}
            className="rounded-sm hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {place.name}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 text-sm text-muted-foreground">
        {(where || place.address) && (
          <p className="flex gap-2">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{[place.address, where].filter(Boolean).join(" · ")}</span>
          </p>
        )}
        {place.timings && (
          <p className="flex gap-2">
            <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="line-clamp-2 min-w-0 break-words">{place.timings}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
