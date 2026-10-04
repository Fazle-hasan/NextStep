import type { MapPoint } from "@/lib/maps";
import type { Enums } from "@/types/database";

export type ListingType = Enums<"listing_type">;

export type AreaLink = { id: string; name: string; slug: string; hasGuide: boolean };

export type CityAreas = { id: string; name: string; slug: string; areas: AreaLink[] };

export type Area = {
  id: string;
  name: string;
  slug: string;
  center: MapPoint | null;
  city: { id: string; name: string; slug: string };
};

// One row of the "typical rent" table. Amounts are monthly, in paise.
export type RentRange = { type: ListingType; min: number | null; max: number | null };

export type AreaGuide = {
  summary: string;
  rentRanges: RentRange[];
  commuteNotes: string | null;
  safetyNotes: string | null;
  halalFoodNotes: string | null;
  updatedAt: string;
};

export type NearbyPlace = {
  id: string;
  name: string;
  placeType: Enums<"place_type">;
  address: string | null;
  timings: string | null;
  lat: number;
  lng: number;
  distanceM: number;
};

export type AreaTip = {
  id: string;
  body: string;
  createdAt: string;
  upvoteCount: number;
  // Null when the viewer may not read the author's profile (e.g. signed out).
  authorName: string | null;
  isMine: boolean;
  upvotedByMe: boolean;
};
