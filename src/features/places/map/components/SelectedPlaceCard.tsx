"use client";

import { X } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { PLACE_TYPE_LABELS } from "../../labels";
import { mapPageStrings } from "../strings";
import type { MapPlace } from "../types";

const s = mapPageStrings.place;

type Props = { place: MapPlace; onClose: () => void };

// Details of the place whose marker was tapped.
export function SelectedPlaceCard({ place, onClose }: Props) {
  return (
    <section aria-label={s.heading} className="flex items-start gap-3 rounded-xl border bg-card p-3">
      <div className="min-w-0 flex-1 space-y-1">
        <Badge variant="secondary">{PLACE_TYPE_LABELS[place.place_type]}</Badge>
        <h3 className="font-medium break-words">{place.name}</h3>
        {place.address && <p className="text-sm break-words text-muted-foreground">{place.address}</p>}
        <Link href={`/places/${place.id}`} className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
          {s.open}
        </Link>
      </div>
      <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label={s.close} onClick={onClose}>
        <X aria-hidden="true" />
      </Button>
    </section>
  );
}
