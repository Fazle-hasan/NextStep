"use client";

import { useEffect, useState } from "react";

import type { MapBounds } from "@/lib/maps";
import type { Enums } from "@/types/database";

import { loadMapPlaces } from "./actions";
import type { MapPlace } from "./types";

const DEBOUNCE_MS = 400;

// Places for the current map viewport. Starts from the server-loaded list and reloads (debounced)
// whenever the viewport or the chosen place types change.
export function useViewportPlaces(
  initialPlaces: MapPlace[],
  bounds: MapBounds | null,
  types: Enums<"place_type">[],
): MapPlace[] {
  const typesKey = types.join(",");
  const [loaded, setLoaded] = useState<{ typesKey: string; places: MapPlace[] } | null>(null);

  useEffect(() => {
    if (!bounds || typesKey === "") return;
    let cancelled = false;
    const timer = setTimeout(() => {
      loadMapPlaces({ bounds, types: typesKey.split(",") }).then((result) => {
        if (!cancelled && result.ok) setLoaded({ typesKey, places: result.data });
      });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bounds, typesKey]);

  if (typesKey === "") return [];
  return loaded && loaded.typesKey === typesKey ? loaded.places : initialPlaces;
}
