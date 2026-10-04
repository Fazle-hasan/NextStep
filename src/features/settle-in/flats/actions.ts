"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getViewer } from "@/features/auth/queries";
import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { BUCKETS } from "@/lib/supabase/storage";
import { rupeesToPaise } from "@/lib/utils/money";

import { parsePoint, type LatLng } from "./geo";
import {
  addressSchema,
  contactRequestSchema,
  contactRespondSchema,
  contactWithdrawSchema,
  listingCreateSchema,
  listingIdSchema,
  listingStatusSchema,
  listingUpdateSchema,
  photoAddSchema,
  photoOrderSchema,
  photoRemoveSchema,
  type ListingFormValues,
} from "./schemas";
import { flatsStrings } from "./strings";

const { errors, dbErrors } = flatsStrings;

type Supabase = Awaited<ReturnType<typeof createClient>>;

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message || errors.generic;
}

function revalidateListing(listingId: string) {
  revalidatePath("/flats");
  revalidatePath("/flats/mine");
  revalidatePath(`/flats/${listingId}`);
  revalidatePath(`/flats/${listingId}/edit`);
}

function listingColumns(v: ListingFormValues) {
  return {
    listing_type: v.listingType,
    city_id: v.cityId,
    neighbourhood_id: v.neighbourhoodId ?? null,
    title: v.title,
    description: v.description ?? null,
    rent: rupeesToPaise(v.rent),
    deposit: v.deposit !== undefined ? rupeesToPaise(v.deposit) : null,
    furnishing: v.furnishing,
    available_from: v.availableFrom,
    min_stay_months: v.minStayMonths ?? null,
    bedrooms: v.bedrooms ?? null,
    bathrooms: v.bathrooms ?? null,
    amenities: v.amenities,
    food_pref: v.foodPref ?? null,
    tenant_gender_pref: v.tenantGenderPref,
  };
}

// Listing ------------------------------------------------------------------------------

// Creates the listing as 'paused'. The lister then adds the address and photos and publishes it.
export async function createListing(input: unknown): Promise<ActionResult<{ listingId: string }>> {
  const parsed = listingCreateSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const viewer = await getViewer();
  if (!viewer) return fail(dbErrors.not_authenticated);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("flat_listings")
    .insert({ lister_id: viewer.id, ...listingColumns(parsed.data) })
    .select("id")
    .single();
  if (error || !data) return fail(dbErrorMessage(error, dbErrors, errors.generic));

  // The creator now holds the flat_lister role, which changes the navigation.
  revalidatePath("/", "layout");
  return ok({ listingId: data.id });
}

export async function updateListing(input: unknown): Promise<ActionResult> {
  const parsed = listingUpdateSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { listingId, ...values } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("flat_listings")
    .update(listingColumns(values))
    .eq("id", listingId)
    .select("id")
    .maybeSingle();
  if (error) return fail(dbErrorMessage(error, dbErrors, errors.generic));
  if (!data) return fail(errors.notFound);

  revalidateListing(listingId);
  return ok();
}

// Without a device location the pin falls back to the neighbourhood centre, then the city centre.
async function fallbackLocation(supabase: Supabase, listingId: string): Promise<LatLng | null> {
  const { data: listing } = await supabase
    .from("flat_listings")
    .select("city_id, neighbourhood_id")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) return null;

  if (listing.neighbourhood_id) {
    const { data } = await supabase.from("neighbourhoods").select("center").eq("id", listing.neighbourhood_id).maybeSingle();
    const point = parsePoint(data?.center);
    if (point) return point;
  }
  const { data: city } = await supabase.from("cities").select("center").eq("id", listing.city_id).maybeSingle();
  return parsePoint(city?.center);
}

export type SavedPin = "device" | "kept" | "area";

// Saves the exact address (flat_listing_private). `pin` tells the UI which location was stored.
export async function saveListingAddress(input: unknown): Promise<ActionResult<{ pin: SavedPin }>> {
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { listingId, addressLine, landmark, lat, lng } = parsed.data;

  const supabase = await createClient();
  const fromDevice = lat !== null && lng !== null ? { lat, lng } : null;
  let point: LatLng | null = fromDevice;
  let pin: SavedPin = "device";
  if (!point) {
    // Keep a pin the lister saved earlier rather than replacing it with a rougher one.
    const { data: existing } = await supabase.rpc("get_listing_address", { p_listing_id: listingId });
    if (existing?.[0]) {
      point = { lat: existing[0].lat, lng: existing[0].lng };
      pin = "kept";
    } else {
      point = await fallbackLocation(supabase, listingId);
      pin = "area";
    }
  }
  if (!point) return fail(errors.noLocation);

  const { error } = await supabase.rpc("save_listing_address", {
    p_listing_id: listingId,
    p_address_line: addressLine,
    // The RPC treats an empty landmark as "none".
    p_landmark: landmark ?? "",
    p_lat: point.lat,
    p_lng: point.lng,
  });
  // 42501: row-level security refused the write (not the lister).
  if (error) return fail(error.code === "42501" ? dbErrors.not_lister : dbErrorMessage(error, dbErrors, errors.generic));

  revalidateListing(listingId);
  return ok({ pin });
}

export async function setListingStatus(input: unknown): Promise<ActionResult> {
  const parsed = listingStatusSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_listing_status", {
    p_listing_id: parsed.data.listingId,
    p_status: parsed.data.status,
  });
  if (error) return fail(dbErrorMessage(error, dbErrors, errors.generic));
  revalidateListing(parsed.data.listingId);
  return ok();
}

export async function renewListing(input: unknown): Promise<ActionResult> {
  const parsed = listingIdSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);
  const supabase = await createClient();
  const { error } = await supabase.rpc("renew_listing", { p_listing_id: parsed.data.listingId });
  if (error) return fail(dbErrorMessage(error, dbErrors, errors.generic));
  revalidateListing(parsed.data.listingId);
  return ok();
}

export async function deleteListing(input: unknown): Promise<ActionResult> {
  const parsed = listingIdSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_listing", { p_listing_id: parsed.data.listingId });
  if (error) return fail(dbErrorMessage(error, dbErrors, errors.generic));
  revalidateListing(parsed.data.listingId);
  return ok();
}

// Photos -------------------------------------------------------------------------------

// Called after the browser re-encoded the image (EXIF stripped) and uploaded it to
// '{listingId}/{uuid}.jpg' in the listing-photos bucket.
export async function addListingPhoto(input: unknown): Promise<ActionResult<{ id: string; storage_path: string; position: number }>> {
  const parsed = photoAddSchema.safeParse(input);
  if (!parsed.success) return fail(flatsStrings.photos.failed);
  const { listingId, path } = parsed.data;

  const supabase = await createClient();
  const { data: existing } = await supabase.from("flat_listing_photos").select("position").eq("listing_id", listingId);
  const position = Math.min(9, Math.max(-1, ...(existing ?? []).map((p) => p.position)) + 1);

  const { data, error } = await supabase
    .from("flat_listing_photos")
    .insert({ listing_id: listingId, storage_path: path, position })
    .select("id, storage_path, position")
    .single();
  if (error || !data) {
    // Not the lister, or over the limit: do not leave the uploaded file behind.
    await supabase.storage.from(BUCKETS.listingPhotos).remove([path]);
    return fail(dbErrorMessage(error, dbErrors, flatsStrings.photos.failed));
  }

  revalidateListing(listingId);
  return ok(data);
}

export async function removeListingPhoto(input: unknown): Promise<ActionResult> {
  const parsed = photoRemoveSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);
  const { listingId, photoId } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("flat_listing_photos")
    .delete()
    .eq("id", photoId)
    .eq("listing_id", listingId)
    .select("storage_path")
    .maybeSingle();
  if (error) return fail(errors.generic);
  if (!data) return fail(errors.notFound);

  await supabase.storage.from(BUCKETS.listingPhotos).remove([data.storage_path]);
  revalidateListing(listingId);
  return ok();
}

// Saves the order the lister arranged the photos in (the first one is the cover).
export async function reorderListingPhotos(input: unknown): Promise<ActionResult> {
  const parsed = photoOrderSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);
  const { listingId, photoIds } = parsed.data;

  const supabase = await createClient();
  const results = await Promise.all(
    photoIds.map((id, position) =>
      supabase.from("flat_listing_photos").update({ position }).eq("id", id).eq("listing_id", listingId),
    ),
  );
  if (results.some((r) => r.error)) return fail(errors.generic);

  revalidateListing(listingId);
  return ok();
}

// Contact requests ---------------------------------------------------------------------

export async function sendContactRequest(input: unknown): Promise<ActionResult> {
  const parsed = contactRequestSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_contact_request", {
    p_listing_id: parsed.data.listingId,
    p_intro: parsed.data.intro,
  });
  if (error) return fail(dbErrorMessage(error, dbErrors, errors.generic));
  revalidatePath(`/flats/${parsed.data.listingId}`);
  return ok();
}

// Accepting opens a conversation and, through RLS, shares the exact address with that requester.
export async function respondContactRequest(input: unknown): Promise<ActionResult<{ conversationId: string | null }>> {
  const parsed = contactRespondSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("respond_contact_request", {
    p_request_id: parsed.data.requestId,
    p_accept: parsed.data.accept,
  });
  if (error) return fail(dbErrorMessage(error, dbErrors, errors.generic));
  revalidatePath("/flats/mine");
  revalidatePath("/messages");
  return ok({ conversationId: data ?? null });
}

export async function withdrawContactRequest(input: unknown): Promise<ActionResult> {
  const parsed = contactWithdrawSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_contact_request", { p_request_id: parsed.data.requestId });
  if (error) return fail(dbErrorMessage(error, dbErrors, errors.generic));
  revalidatePath(`/flats/${parsed.data.listingId}`);
  return ok();
}

const listerVerificationSchema = z.object({
  note: z.string().trim().max(1000, flatsStrings.listerBadge.noteTooLong).optional(),
});

// The lister asks an admin for the ID-verified badge.
export async function requestListerVerification(input: unknown): Promise<ActionResult> {
  const parsed = listerVerificationSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));

  const supabase = await createClient();
  const { error } = await supabase.rpc("request_lister_verification", { p_note: parsed.data.note || undefined });
  if (error) return fail(dbErrorMessage(error, flatsStrings.listerBadge.errors, errors.generic));

  revalidatePath("/flats/mine");
  return ok();
}

