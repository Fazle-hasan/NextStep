"use server";

import { z } from "zod";

import { dbErrorMessage } from "@/lib/errors";
import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";

import type { SkillOption } from "./types";

const skillNameSchema = z.string().trim().min(1).max(60);

// Adds a skill tag if it does not exist yet (rate-limited in the database) and returns it.
export async function addSkill(input: unknown): Promise<ActionResult<SkillOption>> {
  const parsed = skillNameSchema.safeParse(input);
  if (!parsed.success) return fail("Enter a skill name of up to 60 characters.");

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("add_skill", { p_name: parsed.data });
  if (error || !id) {
    return fail(dbErrorMessage(error, { invalid_skill_name: "That skill name isn't valid." }, "Could not add the skill."));
  }
  const { data: skill } = await supabase.from("skills").select("id, name").eq("id", id).single();
  return skill ? ok(skill) : fail("Could not add the skill.");
}
