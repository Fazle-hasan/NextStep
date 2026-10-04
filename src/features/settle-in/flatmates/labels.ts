import type { Enums } from "@/types/database";

// Display labels for flatmate enums (kept in one place for later Urdu/Hindi translation).

export const GENDER_LABELS: Record<Enums<"gender">, string> = { male: "Male", female: "Female" };

export const PREFERRED_GENDER_LABELS: Record<Enums<"flatmate_gender_pref">, string> = {
  any: "Any",
  male: "Male only",
  female: "Female only",
};

export const FOOD_HABIT_LABELS: Record<Enums<"food_habit">, string> = {
  veg: "Vegetarian",
  non_veg: "Non-vegetarian",
  halal_only: "Halal only",
};

export const SLEEP_SCHEDULE_LABELS: Record<Enums<"sleep_schedule">, string> = {
  early_bird: "Early bird",
  night_owl: "Night owl",
  flexible: "Flexible",
};

export const WORK_SCHEDULE_LABELS: Record<Enums<"work_schedule">, string> = {
  day_shift: "Day shift",
  night_shift: "Night shift",
  work_from_home: "Work from home",
  student: "Student",
  flexible: "Flexible",
};

export const GUESTS_POLICY_LABELS: Record<Enums<"guests_policy">, string> = {
  no_guests: "No guests",
  occasionally: "Occasionally",
  often: "Often",
};
