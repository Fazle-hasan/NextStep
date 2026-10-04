import "server-only";

import { createClient } from "@/lib/supabase/server";

import type { NeighbourhoodOption, SkillOption } from "./types";

// Shared reference data for job screens. Feature-specific queries live in the sub-folders.

export async function getSkills(): Promise<SkillOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("skills").select("id, name").order("name");
  if (error) throw new Error("Could not load skills");
  return data;
}

export async function getNeighbourhoods(): Promise<NeighbourhoodOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("neighbourhoods").select("id, name, city_id").order("name");
  if (error) throw new Error("Could not load neighbourhoods");
  return data;
}
