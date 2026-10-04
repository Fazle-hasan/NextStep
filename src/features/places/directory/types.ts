import type { MapPoint } from "@/lib/maps";
import type { Enums } from "@/types/database";

import type { PlaceType } from "../labels";

export type AreaOption = { id: string; name: string; cityId: string };
export type CityCentre = { id: string; name: string; centre: MapPoint | null };

// A place as shown on a directory card.
export type PlaceListItem = {
  id: string;
  name: string;
  placeType: PlaceType;
  address: string | null;
  timings: string | null;
  isVerified: boolean;
  cityName: string | null;
  areaName: string | null;
};

export type PlaceDetail = PlaceListItem & {
  cityId: string;
  neighbourhoodId: string | null;
  citySlug: string | null;
  areaSlug: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  point: MapPoint | null;
  photoPaths: string[];
};

export type NearbyPlace = {
  id: string;
  name: string;
  placeType: PlaceType;
  address: string | null;
  distanceM: number;
};

export type MySuggestion = {
  id: string;
  placeId: string | null;
  // Name of the place being corrected (null when it is a new place or the place is gone).
  placeName: string | null;
  // Name proposed in the payload.
  proposedName: string | null;
  note: string | null;
  status: Enums<"verification_status">;
  reviewNote: string | null;
  createdAt: string;
};
