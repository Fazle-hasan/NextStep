import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { CityOption, NeighbourhoodOption, RequestDetail, RequestOffer, RequestSummary } from "./types";

// Reference data ---------------------------------------------------------------------

export async function getCities(): Promise<CityOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cities").select("id, name").eq("is_active", true).order("name");
  if (error) throw new Error("Could not load cities");
  return data;
}

export async function getNeighbourhoods(): Promise<NeighbourhoodOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("neighbourhoods").select("id, name, city_id").order("name");
  if (error) throw new Error("Could not load neighbourhoods");
  return data;
}

// My requests ------------------------------------------------------------------------

export async function getMyRequests(userId: string): Promise<RequestSummary[]> {
  const supabase = await createClient();
  const { data: requests, error } = await supabase
    .from("relocation_requests")
    .select("id, city_id, move_from, move_to, status, needs, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load your relocation requests");
  if (requests.length === 0) return [];

  const [cities, offers] = await Promise.all([
    supabase.from("cities").select("id, name"),
    supabase
      .from("relocation_offers")
      .select("request_id, status")
      .in(
        "request_id",
        requests.map((r) => r.id),
      ),
  ]);
  if (cities.error || offers.error) throw new Error("Could not load your relocation requests");
  const cityNames = new Map(cities.data.map((c) => [c.id, c.name]));

  return requests.map((r) => {
    const mine = offers.data.filter((o) => o.request_id === r.id);
    return {
      id: r.id,
      cityName: cityNames.get(r.city_id) ?? "",
      moveFrom: r.move_from,
      moveTo: r.move_to,
      status: r.status,
      needs: r.needs,
      createdAt: r.created_at,
      pendingOffers: mine.filter((o) => o.status === "pending").length,
      acceptedOffers: mine.filter((o) => o.status === "accepted").length,
    };
  });
}

// One of my requests with its offers. Null when it does not exist or is not mine.
export async function getMyRequest(requestId: string, userId: string): Promise<RequestDetail | null> {
  const supabase = await createClient();
  const { data: r, error } = await supabase
    .from("relocation_requests")
    .select(
      "id, user_id, city_id, neighbourhood_ids, move_from, move_to, workplace_address, budget_min, budget_max, household, needs, note, same_gender_buddies_only, status, created_at",
    )
    .eq("id", requestId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load the request");
  if (!r) return null;

  const [city, pin, offers, ratings] = await Promise.all([
    supabase.from("cities").select("name").eq("id", r.city_id).maybeSingle(),
    supabase.from("relocation_requests").select("id").eq("id", requestId).not("workplace_location", "is", null).maybeSingle(),
    supabase
      .from("relocation_offers")
      .select("id, buddy_id, message, status, created_at")
      .eq("request_id", requestId)
      .neq("status", "withdrawn")
      .order("created_at"),
    supabase.from("buddy_ratings").select("buddy_id, rating, comment").eq("request_id", requestId),
  ]);
  if (city.error || pin.error || offers.error || ratings.error) throw new Error("Could not load the request");

  return {
    id: r.id,
    cityId: r.city_id,
    cityName: city.data?.name ?? "",
    neighbourhoodIds: r.neighbourhood_ids,
    moveFrom: r.move_from,
    moveTo: r.move_to,
    workplaceAddress: r.workplace_address,
    hasWorkplacePin: Boolean(pin.data),
    budgetMin: r.budget_min,
    budgetMax: r.budget_max,
    household: r.household,
    needs: r.needs,
    note: r.note,
    sameGenderOnly: r.same_gender_buddies_only,
    status: r.status,
    createdAt: r.created_at,
    offers: await withBuddyDetails(offers.data, ratings.data),
  };
}

type OfferRow = { id: string; buddy_id: string; message: string | null; status: RequestOffer["status"]; created_at: string };
type RatingRow = { buddy_id: string; rating: number; comment: string | null };

async function withBuddyDetails(offers: OfferRow[], ratings: RatingRow[]): Promise<RequestOffer[]> {
  if (offers.length === 0) return [];
  const supabase = await createClient();
  const buddyIds = offers.map((o) => o.buddy_id);
  const offerIds = offers.map((o) => o.id);

  const [profiles, buddies, conversations] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", buddyIds),
    supabase.from("buddy_profiles").select("user_id, bio, languages, rating_avg, rating_count").in("user_id", buddyIds),
    supabase.from("conversations").select("id, context_id").eq("context_type", "relocation_offer").in("context_id", offerIds),
  ]);
  if (profiles.error || buddies.error || conversations.error) throw new Error("Could not load the offers");

  const names = new Map(profiles.data.map((p) => [p.id, p.full_name]));
  const buddyById = new Map(buddies.data.map((b) => [b.user_id, b]));
  const conversationByOffer = new Map(conversations.data.map((c) => [c.context_id, c.id]));
  const ratingByBuddy = new Map(ratings.map((x) => [x.buddy_id, x]));

  return offers.map((o) => {
    const buddy = buddyById.get(o.buddy_id);
    const rating = ratingByBuddy.get(o.buddy_id);
    return {
      id: o.id,
      buddyId: o.buddy_id,
      buddyName: names.get(o.buddy_id) ?? "Community member",
      bio: buddy?.bio ?? null,
      languages: buddy?.languages ?? [],
      ratingAvg: buddy?.rating_avg ?? null,
      ratingCount: buddy?.rating_count ?? 0,
      message: o.message,
      status: o.status,
      createdAt: o.created_at,
      conversationId: conversationByOffer.get(o.id) ?? null,
      myRating: rating ? { rating: rating.rating, comment: rating.comment } : null,
    };
  });
}
