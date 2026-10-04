import "server-only";

import { parseEwkbPoint } from "@/lib/maps/geo";
import type { MapPoint } from "@/lib/maps/types";
import { createClient } from "@/lib/supabase/server";

import { likePattern, PAGE_SIZE, type PlaceFilters } from "./schemas";
import type { AreaOption, CityCentre, MySuggestion, NearbyPlace, PlaceDetail, PlaceListItem } from "./types";

// All reads run as the current visitor: RLS returns only verified, non-hidden places to the public.

const LIST_SELECT = "id, name, place_type, address, timings, is_verified, cities ( name ), neighbourhoods ( name )" as const;

export async function searchPlaces(filters: PlaceFilters, page: number): Promise<{ places: PlaceListItem[]; total: number }> {
  const supabase = await createClient();
  let query = supabase
    .from("places")
    .select(LIST_SELECT, { count: "exact" })
    // Admins can read unverified and hidden places; the directory never shows them.
    .eq("is_verified", true)
    .is("hidden_at", null);
  if (filters.q) query = query.ilike("name", likePattern(filters.q));
  if (filters.city) query = query.eq("city_id", filters.city);
  if (filters.area) query = query.eq("neighbourhood_id", filters.area);
  if (filters.type) query = query.eq("place_type", filters.type);

  const from = (page - 1) * PAGE_SIZE;
  // The enum order puts Shia masjids and imambargahs first.
  const { data, count, error } = await query
    .order("place_type")
    .order("name")
    .range(from, from + PAGE_SIZE - 1);
  if (error) {
    // A page past the end is not an error for the visitor.
    if (error.code === "PGRST103") return { places: [], total: 0 };
    throw new Error("Could not load places");
  }

  return {
    total: count ?? data.length,
    places: data.map((row) => ({
      id: row.id,
      name: row.name,
      placeType: row.place_type,
      address: row.address,
      timings: row.timings,
      isVerified: row.is_verified,
      cityName: row.cities?.name ?? null,
      areaName: row.neighbourhoods?.name ?? null,
    })),
  };
}

export async function getPlace(id: string): Promise<PlaceDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("places")
    .select(
      "id, name, place_type, address, timings, is_verified, city_id, neighbourhood_id, phone, website, notes, location, cities ( name, slug ), neighbourhoods ( name, slug ), place_photos ( storage_path, position )",
    )
    .eq("id", id)
    .eq("is_verified", true)
    .is("hidden_at", null)
    .maybeSingle();
  if (error) throw new Error("Could not load the place");
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    placeType: data.place_type,
    address: data.address,
    timings: data.timings,
    isVerified: data.is_verified,
    cityId: data.city_id,
    neighbourhoodId: data.neighbourhood_id,
    cityName: data.cities?.name ?? null,
    citySlug: data.cities?.slug ?? null,
    areaName: data.neighbourhoods?.name ?? null,
    areaSlug: data.neighbourhoods?.slug ?? null,
    phone: data.phone,
    website: data.website,
    notes: data.notes,
    point: parseEwkbPoint(typeof data.location === "string" ? data.location : null),
    photoPaths: [...data.place_photos].sort((a, b) => a.position - b.position).map((photo) => photo.storage_path),
  };
}

// Verified places within 2 km, nearest first, without the place itself.
export async function getNearbyPlaces(point: MapPoint, excludeId: string): Promise<NearbyPlace[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("nearby_places", {
    p_lat: point.lat,
    p_lng: point.lng,
    p_radius_km: 2,
    p_limit: 9,
  });
  if (error) return [];
  return data
    .filter((row) => row.id !== excludeId)
    .slice(0, 8)
    .map((row) => ({
      id: row.id,
      name: row.name,
      placeType: row.place_type,
      address: row.address,
      distanceM: row.distance_m,
    }));
}

export async function getAreaOptions(): Promise<AreaOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("neighbourhoods").select("id, name, city_id").order("name");
  if (error) throw new Error("Could not load areas");
  return data.map((row) => ({ id: row.id, name: row.name, cityId: row.city_id }));
}

// Active cities with their centre point (where the location picker opens).
export async function getCityCentres(): Promise<CityCentre[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cities").select("id, name, center").eq("is_active", true).order("name");
  if (error) throw new Error("Could not load cities");
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    centre: parseEwkbPoint(typeof row.center === "string" ? row.center : null),
  }));
}

function payloadName(payload: unknown): string | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const name = (payload as Record<string, unknown>).name;
    if (typeof name === "string" && name.trim()) return name.trim().slice(0, 150);
  }
  return null;
}

export async function getMySuggestions(userId: string): Promise<MySuggestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("place_suggestions")
    .select("id, place_id, payload, note, status, review_note, created_at, places ( name )")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error("Could not load your suggestions");
  return data.map((row) => ({
    id: row.id,
    placeId: row.place_id,
    placeName: row.places?.name ?? null,
    proposedName: payloadName(row.payload),
    note: row.note,
    status: row.status,
    reviewNote: row.review_note,
    createdAt: row.created_at,
  }));
}
