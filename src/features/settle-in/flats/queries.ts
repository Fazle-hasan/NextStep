import "server-only";

import { createClient } from "@/lib/supabase/server";

import { filtersToRpcArgs, type FlatFilters } from "./schemas";
import type {
  FlatCardData,
  FlatDetail,
  IncomingRequest,
  ListingAddress,
  ListingForEdit,
  ListingPhoto,
  MyContactRequest,
  MyListing,
} from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// List search. RLS (inside search_flats) already hides listings that are not open to the viewer's gender,
// blocked listers, and paused or expired listings.
export async function searchFlats(filters: FlatFilters, page: number): Promise<{ flats: FlatCardData[]; total: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_flats", filtersToRpcArgs(filters, page));
  if (error) throw new Error("Could not load flats");
  const rows = data ?? [];
  return { flats: rows, total: Number(rows[0]?.total_count ?? 0) };
}

async function placeNames(
  supabase: Supabase,
  cityId: string,
  neighbourhoodId: string | null,
): Promise<{ cityName: string | null; neighbourhoodName: string | null }> {
  const [{ data: city }, { data: neighbourhood }] = await Promise.all([
    supabase.from("cities").select("name").eq("id", cityId).maybeSingle(),
    neighbourhoodId
      ? supabase.from("neighbourhoods").select("name").eq("id", neighbourhoodId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return { cityName: city?.name ?? null, neighbourhoodName: neighbourhood?.name ?? null };
}

async function listingPhotos(supabase: Supabase, listingId: string): Promise<ListingPhoto[]> {
  const { data } = await supabase
    .from("flat_listing_photos")
    .select("id, storage_path, position")
    .eq("listing_id", listingId)
    .order("position")
    .order("created_at");
  return data ?? [];
}

// The exact address. RLS on flat_listing_private returns a row only to the lister, admins and requesters
// the lister accepted; everyone else gets null. Call this only for those viewers.
async function listingAddress(supabase: Supabase, listingId: string): Promise<ListingAddress | null> {
  const { data } = await supabase.rpc("get_listing_address", { p_listing_id: listingId });
  const row = data?.[0];
  if (!row) return null;
  return { addressLine: row.address_line, landmark: row.landmark ?? null, lat: row.lat, lng: row.lng };
}

async function conversationIds(supabase: Supabase, requestIds: string[]): Promise<Map<string, string>> {
  if (requestIds.length === 0) return new Map();
  const { data } = await supabase
    .from("conversations")
    .select("id, context_id")
    .eq("context_type", "flat_contact")
    .in("context_id", requestIds);
  return new Map((data ?? []).map((c) => [c.context_id, c.id]));
}

export async function getFlatDetail(viewerId: string, listingId: string): Promise<FlatDetail | null> {
  const supabase = await createClient();
  const { data: listing } = await supabase.from("flat_listings").select("*").eq("id", listingId).maybeSingle();
  if (!listing || listing.deleted_at) return null;
  const isOwner = listing.lister_id === viewerId;

  const [photos, names, { data: lister }, { data: requests }] = await Promise.all([
    listingPhotos(supabase, listingId),
    placeNames(supabase, listing.city_id, listing.neighbourhood_id),
    supabase.from("profiles").select("full_name").eq("id", listing.lister_id).maybeSingle(),
    isOwner
      ? Promise.resolve({ data: [] })
      : supabase
          .from("flat_contact_requests")
          .select("id, status")
          .eq("listing_id", listingId)
          .eq("requester_id", viewerId)
          .order("created_at", { ascending: false })
          .limit(1),
  ]);

  let myRequest: MyContactRequest | null = null;
  const latest = requests?.[0];
  if (latest) {
    const conversations = latest.status === "accepted" ? await conversationIds(supabase, [latest.id]) : new Map<string, string>();
    myRequest = { id: latest.id, status: latest.status, conversationId: conversations.get(latest.id) ?? null };
  }

  // Never ask for the address on behalf of anyone else (RLS would refuse anyway).
  const address = isOwner || myRequest?.status === "accepted" ? await listingAddress(supabase, listingId) : null;

  return { listing, photos, ...names, listerName: lister?.full_name ?? null, isOwner, myRequest, address };
}

export async function getMyListings(viewerId: string): Promise<MyListing[]> {
  const supabase = await createClient();
  const { data: listings, error } = await supabase
    .from("flat_listings")
    .select("*")
    .eq("lister_id", viewerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load your listings");
  if (listings.length === 0) return [];
  const ids = listings.map((l) => l.id);

  const [{ data: photos }, { data: privateRows }, { data: requests }, { data: cities }, { data: neighbourhoods }] =
    await Promise.all([
      supabase.from("flat_listing_photos").select("listing_id, storage_path, position").in("listing_id", ids).order("position"),
      supabase.from("flat_listing_private").select("listing_id").in("listing_id", ids),
      supabase
        .from("flat_contact_requests")
        .select("id, listing_id, requester_id, intro, status, created_at")
        .in("listing_id", ids)
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: false }),
      supabase.from("cities").select("id, name").in("id", [...new Set(listings.map((l) => l.city_id))]),
      supabase
        .from("neighbourhoods")
        .select("id, name")
        .in("id", [...new Set(listings.map((l) => l.neighbourhood_id).filter((id): id is string => Boolean(id)))]),
    ]);

  const requestRows = requests ?? [];
  const requesterIds = [...new Set(requestRows.map((r) => r.requester_id))];
  const [{ data: profiles }, conversations] = await Promise.all([
    requesterIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", requesterIds)
      : Promise.resolve({ data: [] }),
    conversationIds(
      supabase,
      requestRows.filter((r) => r.status === "accepted").map((r) => r.id),
    ),
  ]);

  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const cityNames = new Map((cities ?? []).map((c) => [c.id, c.name]));
  const areaNames = new Map((neighbourhoods ?? []).map((n) => [n.id, n.name]));
  const withAddress = new Set((privateRows ?? []).map((p) => p.listing_id));
  const now = Date.now();

  return listings.map((listing) => ({
    listing,
    coverPhotoPath: (photos ?? []).find((p) => p.listing_id === listing.id)?.storage_path ?? null,
    cityName: cityNames.get(listing.city_id) ?? null,
    neighbourhoodName: listing.neighbourhood_id ? (areaNames.get(listing.neighbourhood_id) ?? null) : null,
    hasAddress: withAddress.has(listing.id),
    expired: new Date(listing.expires_at).getTime() <= now,
    daysLeft: Math.max(0, Math.floor((new Date(listing.expires_at).getTime() - now) / 86_400_000)),
    requests: requestRows
      .filter((r) => r.listing_id === listing.id)
      .map(
        (r): IncomingRequest => ({
          id: r.id,
          requesterId: r.requester_id,
          requesterName: names.get(r.requester_id) ?? null,
          intro: r.intro,
          status: r.status,
          createdAt: r.created_at,
          conversationId: conversations.get(r.id) ?? null,
        }),
      ),
  }));
}

// The lister's own listing with its private address, for the edit page.
export async function getListingForEdit(viewerId: string, listingId: string): Promise<ListingForEdit | null> {
  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("flat_listings")
    .select("*")
    .eq("id", listingId)
    .eq("lister_id", viewerId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!listing) return null;

  const [photos, address] = await Promise.all([listingPhotos(supabase, listingId), listingAddress(supabase, listingId)]);
  return { listing, photos, address };
}
