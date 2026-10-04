"use server";

import { revalidatePath } from "next/cache";

import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import { deleteSavedSearchSchema, saveSearchSchema, setSearchAlertSchema, toggleSavedJobSchema } from "./schemas";
import { searchStrings as s } from "./strings";

async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

export async function toggleSavedJob(input: unknown): Promise<ActionResult<{ saved: boolean }>> {
  const parsed = toggleSavedJobSchema.safeParse(input);
  if (!parsed.success) return fail(s.save.failed);

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return fail(s.save.failed);

  const { jobId, save } = parsed.data;
  if (save) {
    const { error } = await supabase.from("saved_jobs").insert({ user_id: userId, job_id: jobId });
    // 23505 = already saved, which is the state we want.
    if (error && error.code !== "23505") return fail(s.save.failed);
  } else {
    const { error } = await supabase.from("saved_jobs").delete().eq("user_id", userId).eq("job_id", jobId);
    if (error) return fail(s.save.failed);
  }

  revalidatePath("/saved");
  return ok({ saved: save });
}

export async function saveSearch(input: unknown): Promise<ActionResult> {
  const parsed = saveSearchSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? s.saveSearch.failed);

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return fail(s.saveSearch.failed);

  const { name, daily, filters } = parsed.data;
  const { error } = await supabase.from("saved_searches").insert({
    user_id: userId,
    name,
    // Drop undefined values so the stored JSON only holds filters in use.
    filters: JSON.parse(JSON.stringify(filters)),
    alert_frequency: daily ? "daily" : "none",
  });
  if (error) return fail(dbErrorMessage(error, { saved_search_limit_reached: s.saveSearch.limit }, s.saveSearch.failed));

  revalidatePath("/saved");
  return ok();
}

export async function setSearchAlert(input: unknown): Promise<ActionResult> {
  const parsed = setSearchAlertSchema.safeParse(input);
  if (!parsed.success) return fail(s.saved.actionFailed);

  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_searches")
    .update({ alert_frequency: parsed.data.daily ? "daily" : "none" })
    .eq("id", parsed.data.id);
  if (error) return fail(s.saved.actionFailed);

  revalidatePath("/saved");
  return ok();
}

export async function deleteSavedSearch(input: unknown): Promise<ActionResult> {
  const parsed = deleteSavedSearchSchema.safeParse(input);
  if (!parsed.success) return fail(s.saved.actionFailed);

  const supabase = await createClient();
  const { error } = await supabase.from("saved_searches").delete().eq("id", parsed.data.id);
  if (error) return fail(s.saved.actionFailed);

  revalidatePath("/saved");
  return ok();
}
