import "server-only";

import { createClient } from "@/lib/supabase/server";

import { MATCHES_PAGE_SIZE } from "./schemas";
import type { ConnectionRequest, ConnectionRequests, FlatmateMatch, FlatmateProfile, NeighbourhoodOption } from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function getMyFlatmateProfile(userId: string): Promise<FlatmateProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("flatmate_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error("Could not load your flatmate profile");
  return data;
}

// All neighbourhoods; the form filters them by the chosen city.
export async function getNeighbourhoodOptions(): Promise<NeighbourhoodOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("neighbourhoods").select("id, name, city_id").order("name");
  if (error) throw new Error("Could not load areas");
  return data.map((row) => ({ id: row.id, name: row.name, cityId: row.city_id }));
}

// Chat ids for accepted connections, keyed by connection id.
async function getConversationIds(supabase: Supabase, connectionIds: string[]): Promise<Map<string, string>> {
  if (connectionIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("conversations")
    .select("id, context_id")
    .eq("context_type", "flatmate_connection")
    .in("context_id", connectionIds);
  if (error) throw new Error("Could not load chats");
  return new Map(data.map((row) => [row.context_id, row.id]));
}

// The match list, best score first. RLS and the RPC apply the hard filters (city, gender both ways, blocks).
export async function getFlatmateMatches(
  userId: string,
  page: number,
): Promise<{ matches: FlatmateMatch[]; hasNext: boolean }> {
  const supabase = await createClient();
  // One extra row tells us whether there is a next page.
  const { data, error } = await supabase.rpc("get_flatmate_matches", {
    p_limit: MATCHES_PAGE_SIZE + 1,
    p_offset: (page - 1) * MATCHES_PAGE_SIZE,
  });
  if (error) throw new Error("Could not load matches");

  const rows = data.slice(0, MATCHES_PAGE_SIZE);
  const connectedIds = rows.filter((row) => row.connection_status === "accepted").map((row) => row.user_id);

  // Accepted connections with the people on this page -> their chat.
  const chatByUser = new Map<string, string>();
  if (connectedIds.length > 0) {
    const { data: connections, error: connectionsError } = await supabase
      .from("flatmate_connections")
      .select("id, requester_id, recipient_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
    if (connectionsError) throw new Error("Could not load connections");
    const conversationIds = await getConversationIds(
      supabase,
      connections.map((connection) => connection.id),
    );
    for (const connection of connections) {
      const other = connection.requester_id === userId ? connection.recipient_id : connection.requester_id;
      const conversationId = conversationIds.get(connection.id);
      if (conversationId) chatByUser.set(other, conversationId);
    }
  }

  return {
    hasNext: data.length > MATCHES_PAGE_SIZE,
    matches: rows.map((row) => ({
      userId: row.user_id,
      fullName: row.full_name,
      gender: row.gender,
      score: row.score,
      neighbourhoodIds: row.neighbourhood_ids ?? [],
      budgetMin: row.budget_min,
      budgetMax: row.budget_max,
      moveDate: row.move_date,
      foodHabit: row.food_habit,
      smokes: row.smokes,
      sleepSchedule: row.sleep_schedule,
      workSchedule: row.work_schedule,
      cleanliness: row.cleanliness,
      guestsPolicy: row.guests_policy,
      bio: row.bio,
      connectionStatus: row.connection_status,
      conversationId: chatByUser.get(row.user_id) ?? null,
    })),
  };
}

// Connect requests the user received and sent, newest first. Names come from profiles (never phone or email).
export async function getConnectionRequests(userId: string): Promise<ConnectionRequests> {
  const supabase = await createClient();
  const { data: connections, error } = await supabase
    .from("flatmate_connections")
    .select("id, requester_id, recipient_id, message, status, created_at")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Could not load connect requests");

  const otherIds = [...new Set(connections.map((c) => (c.requester_id === userId ? c.recipient_id : c.requester_id)))];
  const acceptedIds = connections.filter((c) => c.status === "accepted").map((c) => c.id);

  const [profiles, conversationIds] = await Promise.all([
    otherIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", otherIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[], error: null }),
    getConversationIds(supabase, acceptedIds),
  ]);
  if (profiles.error) throw new Error("Could not load connect requests");
  const names = new Map((profiles.data ?? []).map((profile) => [profile.id, profile.full_name]));

  const incoming: ConnectionRequest[] = [];
  const sent: ConnectionRequest[] = [];
  for (const connection of connections) {
    const isIncoming = connection.recipient_id === userId;
    const otherUserId = isIncoming ? connection.requester_id : connection.recipient_id;
    (isIncoming ? incoming : sent).push({
      id: connection.id,
      otherUserId,
      otherName: names.get(otherUserId) ?? null,
      message: connection.message,
      status: connection.status,
      createdAt: connection.created_at,
      conversationId: conversationIds.get(connection.id) ?? null,
    });
  }
  return { incoming, sent };
}

// How many connect requests are waiting for the user's answer.
export async function countPendingIncoming(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("flatmate_connections")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("status", "pending");
  if (error) throw new Error("Could not load connect requests");
  return count ?? 0;
}
