import type { MapPoint } from "@/lib/maps";
import type { Database } from "@/types/database";

// One row of search_flats_near(): a flat at its APPROXIMATE point, with distances.
export type MapFlat = Database["public"]["Functions"]["search_flats_near"]["Returns"][number];

// One row of places_in_view().
export type MapPlace = Database["public"]["Functions"]["places_in_view"]["Returns"][number];

export type MapCity = { id: string; name: string; center: MapPoint | null };

export type FlatResults = { flats: MapFlat[]; total: number };
