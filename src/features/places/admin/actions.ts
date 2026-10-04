"use server";

import { revalidatePath } from "next/cache";

import { toEwktPoint } from "@/lib/maps/geo";
import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import {
  buildRentRanges,
  guideFormSchema,
  idSchema,
  MAX_PLACE_PHOTOS,
  placeFlagSchema,
  placeFormSchema,
  placePhotoSchema,
  suggestionReviewSchema,
  tipHiddenSchema,
} from "./schemas";
import { placesAdminStrings } from "./strings";

const { errors } = placesAdminStrings;
const PLACE_PHOTOS_BUCKET = "place-photos";

// Every write runs as the signed-in admin. RLS (and the RPCs) refuse anyone else, and a trigger
// records each change in the audit log.

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function currentUserId(supabase: Supabase): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

function revalidatePlaces(id?: string) {
  revalidatePath("/admin/places");
  revalidatePath("/admin");
  revalidatePath("/places");
  revalidatePath("/map");
  if (id) {
    revalidatePath(`/admin/places/${id}`);
    revalidatePath(`/places/${id}`);
  }
}

export async function savePlace(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = placeFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);
  const v = parsed.data;

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return fail(errors.admin_only);

  if (v.neighbourhoodId) {
    const { data: area } = await supabase.from("neighbourhoods").select("city_id").eq("id", v.neighbourhoodId).maybeSingle();
    if (!area || area.city_id !== v.cityId) return fail(errors.area);
  }

  const fields = {
    name: v.name,
    place_type: v.placeType,
    city_id: v.cityId,
    neighbourhood_id: v.neighbourhoodId,
    address: v.address,
    phone: v.phone,
    website: v.website,
    timings: v.timings,
    notes: v.notes,
    is_verified: v.isVerified,
    location: toEwktPoint({ lat: v.lat, lng: v.lng }),
  };

  if (v.id) {
    const { data, error } = await supabase.from("places").update(fields).eq("id", v.id).select("id");
    if (error) return fail(errors.generic);
    if (!data || data.length === 0) return fail(errors.notFound);
    revalidatePlaces(v.id);
    return ok({ id: v.id });
  }

  const { data, error } = await supabase
    .from("places")
    .insert({ ...fields, created_by: userId })
    .select("id")
    .single();
  if (error || !data) return fail(error?.code === "42501" ? errors.admin_only : errors.generic);
  revalidatePlaces(data.id);
  return ok({ id: data.id });
}

export async function setPlaceVerified(input: unknown): Promise<ActionResult> {
  const parsed = placeFlagSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("places")
    .update({ is_verified: parsed.data.value })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return fail(errors.generic);
  if (!data || data.length === 0) return fail(errors.notFound);
  revalidatePlaces(parsed.data.id);
  return ok();
}

export async function setPlaceHidden(input: unknown): Promise<ActionResult> {
  const parsed = placeFlagSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("places")
    .update({ hidden_at: parsed.data.value ? new Date().toISOString() : null })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return fail(errors.generic);
  if (!data || data.length === 0) return fail(errors.notFound);
  revalidatePlaces(parsed.data.id);
  return ok();
}

export async function deletePlace(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);
  const supabase = await createClient();

  const { data: photos } = await supabase.from("place_photos").select("storage_path").eq("place_id", parsed.data.id);
  const { data, error } = await supabase.from("places").delete().eq("id", parsed.data.id).select("id");
  if (error) return fail(errors.generic);
  if (!data || data.length === 0) return fail(errors.notFound);
  // The rows are gone (cascade); remove the files too. A leftover file is harmless, so failures are ignored.
  if (photos && photos.length > 0) {
    await supabase.storage.from(PLACE_PHOTOS_BUCKET).remove(photos.map((p) => p.storage_path));
  }
  revalidatePlaces(parsed.data.id);
  return ok();
}

// Called after the browser has uploaded the (re-encoded) file to the place's folder.
export async function addPlacePhoto(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = placePhotoSchema.safeParse(input);
  if (!parsed.success) return fail(errors.photoPath);
  const supabase = await createClient();

  const { count } = await supabase
    .from("place_photos")
    .select("id", { count: "exact", head: true })
    .eq("place_id", parsed.data.placeId);
  if ((count ?? 0) >= MAX_PLACE_PHOTOS) {
    await supabase.storage.from(PLACE_PHOTOS_BUCKET).remove([parsed.data.storagePath]);
    return fail(placesAdminStrings.photos.errors.limit);
  }

  const { data, error } = await supabase
    .from("place_photos")
    .insert({ place_id: parsed.data.placeId, storage_path: parsed.data.storagePath, position: parsed.data.position })
    .select("id")
    .single();
  if (error || !data) {
    await supabase.storage.from(PLACE_PHOTOS_BUCKET).remove([parsed.data.storagePath]);
    return fail(error?.code === "42501" ? errors.admin_only : errors.generic);
  }
  revalidatePlaces(parsed.data.placeId);
  return ok({ id: data.id });
}

export async function deletePlacePhoto(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("place_photos")
    .delete()
    .eq("id", parsed.data.id)
    .select("place_id, storage_path");
  if (error) return fail(errors.generic);
  const row = data?.[0];
  if (!row) return fail(errors.notFound);
  await supabase.storage.from(PLACE_PHOTOS_BUCKET).remove([row.storage_path]);
  revalidatePlaces(row.place_id);
  return ok();
}

// The RPC checks the admin role, creates or updates the place, notifies the member and writes the audit log.
export async function reviewPlaceSuggestion(input: unknown): Promise<ActionResult> {
  const parsed = suggestionReviewSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_place_suggestion", {
    p_suggestion_id: parsed.data.id,
    p_approve: parsed.data.approve,
    p_note: parsed.data.reason || undefined,
  });
  if (error) return fail(dbErrorMessage(error, errors, errors.generic));
  revalidatePlaces();
  return ok();
}

// Area guides ---------------------------------------------------------------------------------

async function revalidateArea(supabase: Supabase, neighbourhoodId: string) {
  revalidatePath("/admin/areas");
  revalidatePath(`/admin/areas/${neighbourhoodId}`);
  revalidatePath("/areas");
  const { data } = await supabase.from("neighbourhoods").select("slug, cities ( slug )").eq("id", neighbourhoodId).maybeSingle();
  if (data?.cities) revalidatePath(`/areas/${data.cities.slug}/${data.slug}`);
}

export async function saveGuide(input: unknown): Promise<ActionResult> {
  const parsed = guideFormSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);
  const v = parsed.data;

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return fail(errors.admin_only);

  const { data, error } = await supabase
    .from("area_guides")
    .upsert(
      {
        neighbourhood_id: v.neighbourhoodId,
        summary: v.summary,
        rent_ranges: buildRentRanges(v.rent),
        commute_notes: v.commuteNotes,
        safety_notes: v.safetyNotes,
        halal_food_notes: v.halalFoodNotes,
        is_published: v.isPublished,
        updated_by: userId,
      },
      { onConflict: "neighbourhood_id" },
    )
    .select("id");
  if (error) return fail(error.code === "42501" ? errors.admin_only : errors.generic);
  if (!data || data.length === 0) return fail(errors.notFound);
  await revalidateArea(supabase, v.neighbourhoodId);
  return ok();
}

export async function deleteGuide(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);
  const supabase = await createClient();
  const { data, error } = await supabase.from("area_guides").delete().eq("neighbourhood_id", parsed.data.id).select("id");
  if (error) return fail(errors.generic);
  if (!data || data.length === 0) return fail(errors.notFound);
  await revalidateArea(supabase, parsed.data.id);
  return ok();
}

// Hide or restore a community tip (RPC: admin check plus audit log).
export async function setTipHidden(input: unknown): Promise<ActionResult> {
  const parsed = tipHiddenSchema.safeParse(input);
  if (!parsed.success) return fail(errors.invalid);
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_content_hidden", {
    p_type: "area_tip",
    p_target_id: parsed.data.id,
    p_hidden: parsed.data.hidden,
  });
  if (error) return fail(dbErrorMessage(error, errors, errors.generic));
  await revalidateArea(supabase, parsed.data.neighbourhoodId);
  return ok();
}
