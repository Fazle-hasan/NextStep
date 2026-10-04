"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { BUCKETS } from "@/lib/supabase/storage";

import { idSchema, registerCvSchema } from "./schemas";
import { seekerStrings } from "./strings";

const { errors } = seekerStrings;
const PROFILE_PATH = "/profile";
// The owner's own "view" link; employers get their own 10-minute link elsewhere.
const OWN_CV_URL_SECONDS = 60;

async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

// Records a CV that the browser has just uploaded to the private bucket.
export async function registerCv(input: unknown): Promise<ActionResult> {
  const parsed = registerCvSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? errors.cvUpload);
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const { storagePath, fileName, sizeBytes } = parsed.data;
  if (!storagePath.startsWith(`${userId}/`)) return fail(errors.cvUpload);

  const { data: existingDefault } = await supabase.from("cvs").select("id").eq("user_id", userId).eq("is_default", true).limit(1);
  const { error } = await supabase.from("cvs").insert({
    user_id: userId,
    storage_path: storagePath,
    file_name: fileName,
    size_bytes: sizeBytes,
    is_default: (existingDefault ?? []).length === 0,
  });
  if (error) {
    // Do not leave an orphaned file behind.
    await supabase.storage.from(BUCKETS.cvs).remove([storagePath]);
    return fail(dbErrorMessage(error, { cv_limit_reached: errors.cvLimit }, errors.cvUpload));
  }
  revalidatePath(PROFILE_PATH);
  return ok();
}

export async function setDefaultCv(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  // Only one default is allowed per user, so clear the old one first.
  const { error: clearError } = await supabase.from("cvs").update({ is_default: false }).eq("user_id", userId).eq("is_default", true);
  if (clearError) return fail(errors.generic);
  const { data, error } = await supabase
    .from("cvs")
    .update({ is_default: true })
    .eq("id", parsed.data)
    .eq("user_id", userId)
    .select("id");
  if (error || data.length === 0) return fail(errors.generic);
  revalidatePath(PROFILE_PATH);
  return ok();
}

export async function deleteCv(input: unknown): Promise<ActionResult> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return fail(errors.generic);
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const { data: cv } = await supabase
    .from("cvs")
    .select("id, storage_path, is_default")
    .eq("id", parsed.data)
    .eq("user_id", userId)
    .maybeSingle();
  if (!cv) return fail(errors.generic);

  const { error } = await supabase.from("cvs").delete().eq("id", cv.id).eq("user_id", userId);
  if (error) {
    // 23503: an application still references this CV (on delete restrict).
    return fail(error.code === "23503" ? errors.cvInUse : errors.generic);
  }
  await supabase.storage.from(BUCKETS.cvs).remove([cv.storage_path]);

  if (cv.is_default) {
    const { data: next } = await supabase
      .from("cvs")
      .select("id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1);
    if (next?.[0]) await supabase.from("cvs").update({ is_default: true }).eq("id", next[0].id).eq("user_id", userId);
  }
  revalidatePath(PROFILE_PATH);
  return ok();
}

// Short-lived link so the owner can open their own CV.
export async function getOwnCvUrl(input: unknown): Promise<ActionResult<{ url: string }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return fail(errors.cvOpen);
  const { supabase, userId } = await getSession();
  if (!userId) return fail(errors.notSignedIn);

  const { data: cv } = await supabase.from("cvs").select("storage_path").eq("id", parsed.data).eq("user_id", userId).maybeSingle();
  if (!cv) return fail(errors.cvOpen);
  const { data, error } = await supabase.storage.from(BUCKETS.cvs).createSignedUrl(cv.storage_path, OWN_CV_URL_SECONDS);
  if (error || !data?.signedUrl) return fail(errors.cvOpen);
  return ok({ url: data.signedUrl });
}
