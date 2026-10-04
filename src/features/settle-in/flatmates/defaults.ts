import { paiseToRupees } from "@/lib/utils/money";

import type { FlatmateProfileInput } from "./schemas";
import type { FlatmateProfile } from "./types";

// Form values for the profile form: the saved profile, or sensible blanks for a new one.
export function profileFormDefaults(profile: FlatmateProfile | null, fallbackCityId: string | null): FlatmateProfileInput {
  return {
    cityId: profile?.city_id ?? fallbackCityId ?? "",
    neighbourhoodIds: profile?.neighbourhood_ids ?? [],
    budgetMin: profile ? String(paiseToRupees(profile.budget_min)) : "",
    budgetMax: profile ? String(paiseToRupees(profile.budget_max)) : "",
    moveDate: profile?.move_date ?? "",
    preferredGender: profile?.preferred_gender ?? "any",
    foodHabit: profile?.food_habit ?? "halal_only",
    smokes: profile?.smokes ?? false,
    okWithSmoker: profile?.ok_with_smoker ?? false,
    sleepSchedule: profile?.sleep_schedule ?? "flexible",
    workSchedule: profile?.work_schedule ?? "flexible",
    cleanliness: (profile ? String(profile.cleanliness) : "3") as FlatmateProfileInput["cleanliness"],
    guestsPolicy: profile?.guests_policy ?? "occasionally",
    bio: profile?.bio ?? "",
    isActive: profile?.is_active ?? true,
  };
}
