import "server-only";

import { parseEwkbPoint } from "@/lib/maps/geo";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

import { PLACE_TYPE_LABELS, type PlaceType } from "../labels";
import { ADMIN_PAGE_SIZE, likePattern, LISTING_TYPES, type AdminPlaceFilters } from "./schemas";
import { placesAdminStrings } from "./strings";
import type {
  AdminAreaCity,
  AdminAreaDetail,
  AdminGuide,
  AdminPlaceDetail,
  AdminPlaceRow,
  AdminTip,
  AreaCentre,
  CityCentre,
  GuideStatus,
  SuggestionRow,
} from "./types";

// All reads run as the signed-in admin: RLS lets admins see unverified, hidden and deleted rows.

export async function getAdminPlaces(filters: AdminPlaceFilters, page: number): Promise<{ places: AdminPlaceRow[]; total: number }> {
  const supabase = await createClient();
  let query = supabase
    .from("places")
    .select("id, name, place_type, address, is_verified, hidden_at, cities ( name ), neighbourhoods ( name )", { count: "exact" });
  if (filters.q) query = query.ilike("name", likePattern(filters.q));
  if (filters.city) query = query.eq("city_id", filters.city);
  if (filters.type) query = query.eq("place_type", filters.type);
  if (filters.state === "verified") query = query.eq("is_verified", true).is("hidden_at", null);
  if (filters.state === "unverified") query = query.eq("is_verified", false);
  if (filters.state === "hidden") query = query.not("hidden_at", "is", null);

  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const { data, count, error } = await query.order("name").range(from, from + ADMIN_PAGE_SIZE - 1);
  if (error) {
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
      cityName: row.cities?.name ?? null,
      areaName: row.neighbourhoods?.name ?? null,
      isVerified: row.is_verified,
      isHidden: row.hidden_at !== null,
    })),
  };
}

export async function getAdminPlace(id: string): Promise<AdminPlaceDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("places")
    .select(
      "id, name, place_type, city_id, neighbourhood_id, address, phone, website, timings, notes, is_verified, hidden_at, location, place_photos ( id, storage_path, position )",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load the place");
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    placeType: data.place_type,
    cityId: data.city_id,
    neighbourhoodId: data.neighbourhood_id,
    address: data.address,
    phone: data.phone,
    website: data.website,
    timings: data.timings,
    notes: data.notes,
    isVerified: data.is_verified,
    isHidden: data.hidden_at !== null,
    location: parseEwkbPoint(typeof data.location === "string" ? data.location : null),
    photos: [...data.place_photos]
      .sort((a, b) => a.position - b.position)
      .map((photo) => ({ id: photo.id, storagePath: photo.storage_path, position: photo.position })),
  };
}

// Cities and neighbourhoods with their map centres (the pin picker opens there).
export async function getAreaCentres(): Promise<{ cities: CityCentre[]; areas: AreaCentre[] }> {
  const supabase = await createClient();
  const [{ data: cities }, { data: areas }] = await Promise.all([
    supabase.from("cities").select("id, name, center").eq("is_active", true).order("name"),
    supabase.from("neighbourhoods").select("id, city_id, name, center").order("name"),
  ]);
  return {
    cities: (cities ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      centre: parseEwkbPoint(typeof c.center === "string" ? c.center : null),
    })),
    areas: (areas ?? []).map((a) => ({
      id: a.id,
      cityId: a.city_id,
      name: a.name,
      centre: parseEwkbPoint(typeof a.center === "string" ? a.center : null),
    })),
  };
}

function payloadText(value: Json | undefined): string | null {
  if (typeof value === "string") return value.trim() ? value.slice(0, 2000) : null;
  if (typeof value === "number") return String(value);
  return null;
}

// Pending suggestions, oldest first, with the proposed fields turned into labelled plain text.
export async function getPendingSuggestions(): Promise<SuggestionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("place_suggestions")
    .select("id, created_at, user_id, place_id, payload, note")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw new Error("Could not load suggestions");
  if (data.length === 0) return [];

  const userIds = [...new Set(data.map((row) => row.user_id))];
  const placeIds = [...new Set(data.map((row) => row.place_id).filter((id): id is string => id !== null))];
  const [{ data: profiles }, { data: places }, { data: cities }, { data: areas }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", userIds),
    placeIds.length
      ? supabase.from("places").select("id, name").in("id", placeIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    supabase.from("cities").select("id, name"),
    supabase.from("neighbourhoods").select("id, name"),
  ]);
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const placeNames = new Map((places ?? []).map((p) => [p.id, p.name]));
  const cityNames = new Map((cities ?? []).map((c) => [c.id, c.name]));
  const areaNames = new Map((areas ?? []).map((a) => [a.id, a.name]));
  const labels = placesAdminStrings.suggestions.fields;

  return data.map((row) => {
    const payload = row.payload && typeof row.payload === "object" && !Array.isArray(row.payload) ? row.payload : {};
    const fields: { label: string; value: string }[] = [];
    for (const key of Object.keys(labels)) {
      const raw = payloadText(payload[key]);
      if (raw === null) continue;
      let value = raw;
      if (key === "place_type") value = PLACE_TYPE_LABELS[raw as PlaceType] ?? raw;
      if (key === "city_id") value = cityNames.get(raw) ?? raw;
      if (key === "neighbourhood_id") value = areaNames.get(raw) ?? raw;
      fields.push({ label: labels[key] ?? key, value });
    }
    return {
      id: row.id,
      createdAt: row.created_at,
      suggesterName: names.get(row.user_id) ?? null,
      placeId: row.place_id,
      placeName: row.place_id ? (placeNames.get(row.place_id) ?? null) : null,
      fields,
      note: row.note,
    };
  });
}

export async function getPendingSuggestionCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("place_suggestions").select("id", { count: "exact", head: true }).eq("status", "pending");
  return count ?? 0;
}

// Area guides ---------------------------------------------------------------------------------

export async function getAdminAreas(): Promise<AdminAreaCity[]> {
  const supabase = await createClient();
  const [{ data: cities, error }, { data: areas }, { data: guides }, { data: tips }] = await Promise.all([
    supabase.from("cities").select("id, name").order("name"),
    supabase.from("neighbourhoods").select("id, city_id, name").order("name"),
    supabase.from("area_guides").select("neighbourhood_id, is_published"),
    supabase.from("area_tips").select("neighbourhood_id").is("deleted_at", null).limit(5000),
  ]);
  if (error) throw new Error("Could not load areas");

  const status = new Map<string, GuideStatus>(
    (guides ?? []).map((g) => [g.neighbourhood_id, g.is_published ? "published" : "draft"]),
  );
  const tipCounts = new Map<string, number>();
  for (const tip of tips ?? []) tipCounts.set(tip.neighbourhood_id, (tipCounts.get(tip.neighbourhood_id) ?? 0) + 1);

  return (cities ?? []).map((city) => ({
    id: city.id,
    name: city.name,
    areas: (areas ?? [])
      .filter((area) => area.city_id === city.id)
      .map((area) => ({
        id: area.id,
        name: area.name,
        status: status.get(area.id) ?? "none",
        tipCount: tipCounts.get(area.id) ?? 0,
      })),
  }));
}

function parseRentRanges(value: Json): AdminGuide["rentRanges"] {
  const ranges: AdminGuide["rentRanges"] = {};
  if (!value || typeof value !== "object" || Array.isArray(value)) return ranges;
  for (const type of LISTING_TYPES) {
    const row = value[type];
    if (row && typeof row === "object" && !Array.isArray(row) && typeof row.min === "number" && typeof row.max === "number") {
      ranges[type] = { min: row.min, max: row.max };
    }
  }
  return ranges;
}

export async function getAdminArea(neighbourhoodId: string): Promise<AdminAreaDetail | null> {
  const supabase = await createClient();
  const { data: area, error } = await supabase
    .from("neighbourhoods")
    .select("id, name, slug, cities ( name, slug )")
    .eq("id", neighbourhoodId)
    .maybeSingle();
  if (error) throw new Error("Could not load the area");
  if (!area || !area.cities) return null;

  const { data: guide } = await supabase
    .from("area_guides")
    .select("summary, rent_ranges, commute_notes, safety_notes, halal_food_notes, is_published")
    .eq("neighbourhood_id", neighbourhoodId)
    .maybeSingle();

  return {
    id: area.id,
    name: area.name,
    slug: area.slug,
    cityName: area.cities.name,
    citySlug: area.cities.slug,
    guide: guide
      ? {
          summary: guide.summary,
          rentRanges: parseRentRanges(guide.rent_ranges),
          commuteNotes: guide.commute_notes,
          safetyNotes: guide.safety_notes,
          halalFoodNotes: guide.halal_food_notes,
          isPublished: guide.is_published,
        }
      : null,
  };
}

// Every tip for the area, including hidden and deleted ones.
export async function getAdminTips(neighbourhoodId: string): Promise<AdminTip[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("area_tips")
    .select("id, body, author_id, upvote_count, created_at, hidden_at, deleted_at")
    .eq("neighbourhood_id", neighbourhoodId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Could not load tips");
  if (data.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", [...new Set(data.map((tip) => tip.author_id))]);
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return data.map((tip) => ({
    id: tip.id,
    body: tip.body,
    authorName: names.get(tip.author_id) ?? null,
    upvoteCount: tip.upvote_count,
    createdAt: tip.created_at,
    isHidden: tip.hidden_at !== null,
    isDeleted: tip.deleted_at !== null,
  }));
}
