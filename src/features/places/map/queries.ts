import "server-only";

import { parseEwkbPoint, type MapBounds, type MapPoint } from "@/lib/maps";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

import { filtersToFlatArgs, PLACE_LIMIT, type MapFilters } from "./schemas";
import type { FlatResults, MapCity, MapPlace } from "./types";

function toPoint(value: unknown): MapPoint | null {
  return typeof value === "string" ? parseEwkbPoint(value) : null;
}

export async function getMapCities(): Promise<MapCity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cities").select("id, name, center").eq("is_active", true).order("name");
  if (error) throw new Error("Could not load cities");
  return data.map((city) => ({ id: city.id, name: city.name, center: toPoint(city.center) }));
}

// Centre of a neighbourhood, falling back to its city. Used to open pin pickers in the right place.
export async function getAreaCentre(cityId: string | null, neighbourhoodId: string | null): Promise<MapPoint | null> {
  const supabase = await createClient();
  if (neighbourhoodId) {
    const { data } = await supabase.from("neighbourhoods").select("center").eq("id", neighbourhoodId).maybeSingle();
    const point = toPoint(data?.center);
    if (point) return point;
  }
  if (!cityId) return null;
  const { data } = await supabase.from("cities").select("center").eq("id", cityId).maybeSingle();
  return toPoint(data?.center);
}

// The workplace pin of the viewer's newest open relocation request, if they saved one.
export async function getRelocationWorkplace(viewerId: string): Promise<MapPoint | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("relocation_requests")
    .select("workplace_location")
    .eq("user_id", viewerId)
    .eq("status", "open")
    .not("workplace_location", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);
  return toPoint(data?.[0]?.workplace_location);
}

// Flats near a masjid and/or the workplace. RLS inside search_flats_near hides listings the viewer may not
// see, and only the APPROXIMATE point of each flat is returned (D-004).
export async function searchFlatsNear(filters: MapFilters, bounds: MapBounds | null): Promise<FlatResults> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_flats_near", filtersToFlatArgs(filters, bounds));
  if (error) throw new Error("Could not load flats");
  const flats = data ?? [];
  return { flats, total: Number(flats[0]?.total_count ?? 0) };
}

// Verified places inside a viewport.
export async function placesInView(bounds: MapBounds, types: Enums<"place_type">[]): Promise<MapPlace[]> {
  if (types.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("places_in_view", {
    p_min_lng: bounds.minLng,
    p_min_lat: bounds.minLat,
    p_max_lng: bounds.maxLng,
    p_max_lat: bounds.maxLat,
    p_types: types,
    p_limit: PLACE_LIMIT,
  });
  if (error) throw new Error("Could not load places");
  return data ?? [];
}
