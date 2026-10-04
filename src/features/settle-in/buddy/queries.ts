import "server-only";

import { createClient } from "@/lib/supabase/server";

import { buddyStrings } from "./strings";
import type { BuddyProfile, MyOffer, OpenRequest } from "./types";

function firstName(fullName: string | null | undefined): string {
  return fullName?.trim().split(/\s+/)[0] || buddyStrings.requests.someone;
}

export async function getBuddyProfile(userId: string): Promise<BuddyProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("buddy_profiles")
    .select("city_id, neighbourhood_ids, bio, languages, help_types, is_active, verification_status, rating_avg, rating_count")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load your buddy profile");
  if (!data) return null;

  let rejectionReason: string | null = null;
  if (data.verification_status === "rejected") {
    const { data: request } = await supabase
      .from("verification_requests")
      .select("rejection_reason")
      .eq("user_id", userId)
      .eq("kind", "buddy")
      .eq("status", "rejected")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    rejectionReason = request?.rejection_reason ?? null;
  }

  return {
    cityId: data.city_id,
    neighbourhoodIds: data.neighbourhood_ids,
    bio: data.bio,
    languages: data.languages,
    helpTypes: data.help_types,
    isActive: data.is_active,
    verificationStatus: data.verification_status,
    rejectionReason,
    ratingAvg: data.rating_avg,
    ratingCount: data.rating_count,
  };
}

// Open requests RLS lets this buddy see (same city, gender rule, not blocked), minus ones already offered on.
export async function getOpenRequestsForBuddy(userId: string): Promise<OpenRequest[]> {
  const supabase = await createClient();
  const [requests, myOffers] = await Promise.all([
    supabase
      .from("relocation_requests")
      .select(
        "id, user_id, city_id, neighbourhood_ids, move_from, move_to, household, needs, budget_min, budget_max, workplace_address, note, created_at",
      )
      .eq("status", "open")
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("relocation_offers").select("request_id").eq("buddy_id", userId).neq("status", "withdrawn"),
  ]);
  if (requests.error || myOffers.error) throw new Error("Could not load open requests");

  const offered = new Set(myOffers.data.map((o) => o.request_id));
  const rows = requests.data.filter((r) => !offered.has(r.id));
  if (rows.length === 0) return [];

  const [profiles, cities, neighbourhoods] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .in(
        "id",
        rows.map((r) => r.user_id),
      ),
    supabase.from("cities").select("id, name"),
    supabase.from("neighbourhoods").select("id, name"),
  ]);
  if (profiles.error || cities.error || neighbourhoods.error) throw new Error("Could not load open requests");
  const names = new Map(profiles.data.map((p) => [p.id, p.full_name]));
  const cityNames = new Map(cities.data.map((c) => [c.id, c.name]));
  const areaNames = new Map(neighbourhoods.data.map((n) => [n.id, n.name]));

  return rows.map((r) => ({
    id: r.id,
    requesterId: r.user_id,
    requesterFirstName: firstName(names.get(r.user_id)),
    cityName: cityNames.get(r.city_id) ?? "",
    areaNames: r.neighbourhood_ids.flatMap((id) => areaNames.get(id) ?? []),
    moveFrom: r.move_from,
    moveTo: r.move_to,
    household: r.household,
    needs: r.needs,
    budgetMin: r.budget_min,
    budgetMax: r.budget_max,
    workplaceAddress: r.workplace_address,
    note: r.note,
    createdAt: r.created_at,
  }));
}

export async function getMyOffers(userId: string): Promise<MyOffer[]> {
  const supabase = await createClient();
  const { data: offers, error } = await supabase
    .from("relocation_offers")
    .select("id, request_id, status, message, created_at")
    .eq("buddy_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error("Could not load your offers");
  if (offers.length === 0) return [];

  const [requests, conversations, cities] = await Promise.all([
    supabase
      .from("relocation_requests")
      .select("id, user_id, city_id, status")
      .in(
        "id",
        offers.map((o) => o.request_id),
      ),
    supabase
      .from("conversations")
      .select("id, context_id")
      .eq("context_type", "relocation_offer")
      .in(
        "context_id",
        offers.map((o) => o.id),
      ),
    supabase.from("cities").select("id, name"),
  ]);
  if (requests.error || conversations.error || cities.error) throw new Error("Could not load your offers");

  const requesterIds = requests.data.map((r) => r.user_id);
  const profiles = requesterIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", requesterIds)
    : { data: [], error: null };
  if (profiles.error) throw new Error("Could not load your offers");

  const requestById = new Map(requests.data.map((r) => [r.id, r]));
  const names = new Map(profiles.data.map((p) => [p.id, p.full_name]));
  const cityNames = new Map(cities.data.map((c) => [c.id, c.name]));
  const conversationByOffer = new Map(conversations.data.map((c) => [c.context_id, c.id]));

  return offers.map((o) => {
    const request = requestById.get(o.request_id);
    return {
      id: o.id,
      requestId: o.request_id,
      requesterFirstName: firstName(request ? names.get(request.user_id) : null),
      cityName: request ? (cityNames.get(request.city_id) ?? "") : "",
      requestStatus: request?.status ?? null,
      status: o.status,
      message: o.message,
      createdAt: o.created_at,
      conversationId: conversationByOffer.get(o.id) ?? null,
    };
  });
}
