import "server-only";

import { parseEwkbPoint, type MapPoint } from "@/lib/maps";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

import { parseRentRanges } from "./schemas";
import type { Area, AreaGuide, AreaTip, CityAreas, NearbyPlace } from "./types";

const NEARBY_RADIUS_KM = 3;
const TIP_LIMIT = 50;

// Cities with their neighbourhoods; hasGuide marks neighbourhoods with a published guide.
export async function getAreasIndex(): Promise<CityAreas[]> {
  const supabase = await createClient();
  const [{ data: cities }, { data: areas }, { data: guides }] = await Promise.all([
    supabase.from("cities").select("id, name, slug").eq("is_active", true).order("name"),
    supabase.from("neighbourhoods").select("id, name, slug, city_id").order("name"),
    supabase.from("area_guides").select("neighbourhood_id").eq("is_published", true),
  ]);
  const withGuide = new Set((guides ?? []).map((g) => g.neighbourhood_id));

  return (cities ?? []).map((city) => ({
    id: city.id,
    name: city.name,
    slug: city.slug,
    areas: (areas ?? [])
      .filter((a) => a.city_id === city.id)
      .map((a) => ({ id: a.id, name: a.name, slug: a.slug, hasGuide: withGuide.has(a.id) })),
  }));
}

export async function getArea(citySlug: string, areaSlug: string): Promise<Area | null> {
  const supabase = await createClient();
  const { data: city } = await supabase.from("cities").select("id, name, slug").eq("slug", citySlug).maybeSingle();
  if (!city) return null;
  const { data: area } = await supabase
    .from("neighbourhoods")
    .select("id, name, slug, center")
    .eq("city_id", city.id)
    .eq("slug", areaSlug)
    .maybeSingle();
  if (!area) return null;

  return {
    id: area.id,
    name: area.name,
    slug: area.slug,
    center: typeof area.center === "string" ? parseEwkbPoint(area.center) : null,
    city,
  };
}

// The published guide for a neighbourhood, or null when none is written yet.
export async function getAreaGuide(neighbourhoodId: string): Promise<AreaGuide | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("area_guides")
    .select("summary, rent_ranges, commute_notes, safety_notes, halal_food_notes, updated_at")
    .eq("neighbourhood_id", neighbourhoodId)
    .eq("is_published", true)
    .maybeSingle();
  if (!data) return null;

  return {
    summary: data.summary,
    rentRanges: parseRentRanges(data.rent_ranges),
    commuteNotes: data.commute_notes,
    safetyNotes: data.safety_notes,
    halalFoodNotes: data.halal_food_notes,
    updatedAt: data.updated_at,
  };
}

// Verified places within 3 km of a point, nearest first.
export async function getNearbyPlaces(center: MapPoint, types: Enums<"place_type">[], limit: number): Promise<NearbyPlace[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("nearby_places", {
    p_lat: center.lat,
    p_lng: center.lng,
    p_radius_km: NEARBY_RADIUS_KM,
    p_types: types,
    p_limit: limit,
  });

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    placeType: p.place_type,
    address: p.address,
    timings: p.timings,
    lat: p.lat,
    lng: p.lng,
    distanceM: p.distance_m,
  }));
}

// Tips for a neighbourhood, most helpful first. Author names and the viewer's own votes are only
// loaded for signed-in viewers (profiles are not readable by signed-out visitors, D-012).
export async function getAreaTips(neighbourhoodId: string, viewerId: string | null): Promise<AreaTip[]> {
  const supabase = await createClient();
  const { data: tips } = await supabase
    .from("area_tips")
    .select("id, author_id, body, upvote_count, created_at")
    .eq("neighbourhood_id", neighbourhoodId)
    .is("deleted_at", null)
    .is("hidden_at", null)
    .order("upvote_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(TIP_LIMIT);
  if (!tips || tips.length === 0) return [];

  const names = new Map<string, string | null>();
  const myVotes = new Set<string>();
  if (viewerId) {
    const [{ data: authors }, { data: votes }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", [...new Set(tips.map((t) => t.author_id))]),
      supabase.from("area_tip_votes").select("tip_id").eq("user_id", viewerId).in("tip_id", tips.map((t) => t.id)),
    ]);
    (authors ?? []).forEach((a) => names.set(a.id, a.full_name));
    (votes ?? []).forEach((v) => myVotes.add(v.tip_id));
  }

  return tips.map((t) => ({
    id: t.id,
    body: t.body,
    createdAt: t.created_at,
    upvoteCount: t.upvote_count,
    authorName: names.get(t.author_id) ?? null,
    isMine: t.author_id === viewerId,
    upvotedByMe: myVotes.has(t.id),
  }));
}

// Whether the signed-in viewer may post tips (verified, active Settle-In Buddy or admin).
export async function canPostAreaTip(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("can_post_area_tip");
  return !error && data === true;
}
