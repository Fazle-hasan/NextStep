"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import { suggestionPayload, suggestionSchema } from "./schemas";
import { placesStrings } from "./strings";

const { errors } = placesStrings;

// Sends a new place or a correction to the admin review queue (place_suggestions).
export async function submitPlaceSuggestion(input: unknown): Promise<ActionResult> {
  const parsed = suggestionSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.invalid);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return fail(errors.notSignedIn);

  const values = parsed.data;

  // A correction must point at a place the user can actually see.
  if (values.placeId) {
    const { data: place } = await supabase.from("places").select("id").eq("id", values.placeId).maybeSingle();
    if (!place) return fail(errors.placeMissing);
  }

  const { data: city } = await supabase.from("cities").select("id").eq("id", values.cityId).maybeSingle();
  if (!city) return fail(errors.city);

  if (values.neighbourhoodId) {
    const { data: area } = await supabase
      .from("neighbourhoods")
      .select("id")
      .eq("id", values.neighbourhoodId)
      .eq("city_id", values.cityId)
      .maybeSingle();
    if (!area) return fail(errors.area);
  }

  const { error } = await supabase.from("place_suggestions").insert({
    user_id: userId,
    place_id: values.placeId,
    payload: suggestionPayload(values),
    note: values.note,
  });
  if (error) return fail(dbErrorMessage(error, errors.db, errors.generic));

  revalidatePath("/places/suggest");
  return ok();
}
