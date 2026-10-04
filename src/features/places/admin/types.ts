import type { MapPoint } from "@/lib/maps/types";
import type { Enums } from "@/types/database";

import type { PlaceType } from "../labels";

export type ListingType = Enums<"listing_type">;

export type AdminPlaceRow = {
  id: string;
  name: string;
  placeType: PlaceType;
  address: string | null;
  cityName: string | null;
  areaName: string | null;
  isVerified: boolean;
  isHidden: boolean;
};

export type AdminPlacePhoto = { id: string; storagePath: string; position: number };

export type AdminPlaceDetail = {
  id: string;
  name: string;
  placeType: PlaceType;
  cityId: string;
  neighbourhoodId: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  timings: string | null;
  notes: string | null;
  isVerified: boolean;
  isHidden: boolean;
  location: MapPoint | null;
  photos: AdminPlacePhoto[];
};

// Cities and neighbourhoods with their map centres, for the place form.
export type CityCentre = { id: string; name: string; centre: MapPoint | null };
export type AreaCentre = { id: string; cityId: string; name: string; centre: MapPoint | null };

export type SuggestionRow = {
  id: string;
  createdAt: string;
  suggesterName: string | null;
  placeId: string | null;
  placeName: string | null;
  // Proposed fields as label/value pairs, ready to print as plain text.
  fields: { label: string; value: string }[];
  note: string | null;
};

export type GuideStatus = "none" | "draft" | "published";

export type AdminAreaRow = { id: string; name: string; status: GuideStatus; tipCount: number };
export type AdminAreaCity = { id: string; name: string; areas: AdminAreaRow[] };

export type AdminGuide = {
  summary: string;
  rentRanges: Partial<Record<ListingType, { min: number; max: number }>>;
  commuteNotes: string | null;
  safetyNotes: string | null;
  halalFoodNotes: string | null;
  isPublished: boolean;
};

export type AdminAreaDetail = {
  id: string;
  name: string;
  slug: string;
  cityName: string;
  citySlug: string;
  guide: AdminGuide | null;
};

export type AdminTip = {
  id: string;
  body: string;
  authorName: string | null;
  upvoteCount: number;
  createdAt: string;
  isHidden: boolean;
  isDeleted: boolean;
};
