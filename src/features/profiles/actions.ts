"use server";

import { revalidatePath } from "next/cache";

import { fail, ok, type ActionResult } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils/redirect";

import { onboardingSchema } from "./schemas";
import { onboardingStrings } from "./strings";

type KnownError = keyof typeof onboardingStrings.errors;

// complete_onboarding raises short codes (e.g. 'invalid_phone'); map them to messages.
function onboardingErrorMessage(message: string | undefined): string {
  if (message && message in onboardingStrings.errors) {
    return onboardingStrings.errors[message as KnownError];
  }
  return onboardingStrings.errors.generic;
}

export async function completeOnboarding(input: unknown, next?: string): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? onboardingStrings.errors.generic);

  const { fullName, gender, cityId, phone, intents, verificationNote } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    p_full_name: fullName,
    p_gender: gender,
    p_city_id: cityId,
    p_intents: intents,
    p_phone: phone,
    p_verification_note: verificationNote || undefined,
  });
  if (error) return fail(onboardingErrorMessage(error.message));

  revalidatePath("/", "layout");
  return ok({ redirectTo: safeNextPath(next) });
}
