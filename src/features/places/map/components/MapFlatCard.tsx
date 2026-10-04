"use client";

import { Briefcase, Home, Landmark } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { LISTING_TYPE_LABELS, TENANT_GENDER_LABELS } from "@/features/settle-in/flats/labels";
import { formatDistance } from "@/lib/maps";
import { listingPhotoUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";
import { formatMonthlyRent } from "@/lib/utils/money";

import { mapPageStrings } from "../strings";
import type { MapFlat } from "../types";

const s = mapPageStrings.results;

type Props = {
  flat: MapFlat;
  selected: boolean;
  onSelect: (id: string) => void;
};

export function flatCardId(id: string): string {
  return `map-flat-${id}`;
}

// One flat in the results list. Hovering, focusing or tapping it highlights its marker on the map.
export function MapFlatCard({ flat, selected, onSelect }: Props) {
  const photo = listingPhotoUrl(flat.cover_photo_path);

  return (
    <li
      id={flatCardId(flat.id)}
      className={cn(
        "flex scroll-mt-4 gap-3 rounded-xl border p-3 transition-colors",
        selected ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "hover:bg-muted/50",
      )}
      onMouseEnter={() => onSelect(flat.id)}
      onFocus={() => onSelect(flat.id)}
      onClick={() => onSelect(flat.id)}
    >
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- listing photo served from Supabase Storage
          <img src={photo} alt={s.photoAlt(flat.title)} loading="lazy" className="size-full object-cover" />
        ) : (
          <Home className="size-7 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-semibold">{formatMonthlyRent(flat.rent)}</p>
        <h3 className="text-sm leading-snug font-medium break-words">
          <Link href={`/flats/${flat.id}`} className="inline-flex min-h-6 items-center hover:underline focus-visible:underline">
            {flat.title}
          </Link>
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{LISTING_TYPE_LABELS[flat.listing_type]}</Badge>
          {flat.tenant_gender_pref !== "any" && <Badge variant="outline">{TENANT_GENDER_LABELS[flat.tenant_gender_pref]}</Badge>}
        </div>
        <ul className="space-y-0.5 text-sm text-muted-foreground">
          {flat.nearest_masjid_name && flat.nearest_masjid_distance_m != null && (
            <li className="flex items-start gap-1.5">
              <Landmark className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {s.fromMasjid(formatDistance(flat.nearest_masjid_distance_m), flat.nearest_masjid_name)}
            </li>
          )}
          {flat.workplace_distance_m != null && (
            <li className="flex items-start gap-1.5">
              <Briefcase className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {s.fromWorkplace(formatDistance(flat.workplace_distance_m))}
            </li>
          )}
        </ul>
      </div>
    </li>
  );
}
