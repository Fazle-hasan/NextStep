"use client";

import { useEffect, useState } from "react";

import type { MapPoint } from "@/lib/maps";

import { loadAreaCentre } from "./actions";

// Centre of the chosen neighbourhood (or city), for opening a pin picker in the right place.
// Returns undefined until it is known or when nothing is chosen.
export function useAreaCentre(cityId: string | null | undefined, neighbourhoodId?: string | null): MapPoint | undefined {
  const [state, setState] = useState<{ key: string; point: MapPoint | null } | null>(null);
  const key = `${cityId || ""}|${neighbourhoodId || ""}`;

  useEffect(() => {
    if (!cityId && !neighbourhoodId) return;
    let cancelled = false;
    loadAreaCentre({ cityId: cityId || null, neighbourhoodId: neighbourhoodId || null }).then((result) => {
      if (!cancelled) setState({ key: `${cityId || ""}|${neighbourhoodId || ""}`, point: result.ok ? result.data : null });
    });
    return () => {
      cancelled = true;
    };
  }, [cityId, neighbourhoodId]);

  return state && state.key === key ? (state.point ?? undefined) : undefined;
}
