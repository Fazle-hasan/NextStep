import type { Enums } from "@/types/database";

export const LISTING_TYPE_LABELS: Record<Enums<"listing_type">, string> = {
  entire_flat: "Entire flat",
  private_room: "Private room",
  shared_room: "Shared room",
  pg_hostel: "PG / hostel",
};

export const LISTING_STATUS_LABELS: Record<Enums<"listing_status">, string> = {
  active: "Live",
  paused: "Paused",
  rented: "Rented",
  expired: "Expired",
};

export const FURNISHING_LABELS: Record<Enums<"furnishing">, string> = {
  unfurnished: "Unfurnished",
  semi: "Semi-furnished",
  full: "Fully furnished",
};

export const FOOD_PREF_LABELS: Record<Enums<"food_pref">, string> = {
  veg_only: "Vegetarian only",
  non_veg_ok: "Non-veg is fine",
  halal_only: "Halal only",
};

export const TENANT_GENDER_LABELS: Record<Enums<"tenant_gender_pref">, string> = {
  any: "Anyone",
  male: "Men only",
  female: "Women only",
  family: "Families",
};

// Stored as short keys in flat_listings.amenities (text[]).
export const AMENITY_LABELS = {
  wifi: "Wi-Fi",
  ac: "Air conditioning",
  washing_machine: "Washing machine",
  fridge: "Fridge",
  kitchen: "Kitchen access",
  geyser: "Geyser / hot water",
  power_backup: "Power backup",
  lift: "Lift",
  parking: "Parking",
  security: "Security / gated",
  balcony: "Balcony",
  attached_bathroom: "Attached bathroom",
  housekeeping: "Housekeeping",
  meals: "Meals included",
  water_purifier: "Water purifier",
} as const;

export type AmenityKey = keyof typeof AMENITY_LABELS;
export const AMENITY_KEYS = Object.keys(AMENITY_LABELS) as [AmenityKey, ...AmenityKey[]];

export function amenityLabel(key: string): string {
  return Object.hasOwn(AMENITY_LABELS, key) ? AMENITY_LABELS[key as AmenityKey] : key;
}
