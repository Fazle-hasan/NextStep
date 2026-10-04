import type { MapMarkerKind } from "@/lib/maps";
import type { Enums } from "@/types/database";

// Labels shared by the places directory, area guides and the map.

export type PlaceType = Enums<"place_type">;

export const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
  shia_masjid: "Shia masjid",
  imambargah: "Imambargah",
  community_center: "Community centre",
  islamic_school: "Islamic school / madrassa",
  halal_restaurant: "Halal restaurant",
  halal_grocery: "Halal grocery",
  hospital_clinic: "Hospital / clinic",
  transit_station: "Transit station",
};

export const PLACE_TYPE_PLURALS: Record<PlaceType, string> = {
  shia_masjid: "Shia masjids",
  imambargah: "Imambargahs",
  community_center: "Community centres",
  islamic_school: "Islamic schools",
  halal_restaurant: "Halal restaurants",
  halal_grocery: "Halal groceries",
  hospital_clinic: "Hospitals & clinics",
  transit_station: "Transit stations",
};

// The two types the "near a masjid" flat filter counts.
export const WORSHIP_PLACE_TYPES: PlaceType[] = ["shia_masjid", "imambargah"];

export function isWorshipPlace(type: PlaceType): boolean {
  return WORSHIP_PLACE_TYPES.includes(type);
}

export function placeMarkerKind(type: PlaceType): MapMarkerKind {
  return isWorshipPlace(type) ? "masjid" : "place";
}
