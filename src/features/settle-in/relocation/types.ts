import type { Enums } from "@/types/database";

export type CityOption = { id: string; name: string };
export type NeighbourhoodOption = { id: string; name: string; city_id: string };

export type RequestSummary = {
  id: string;
  cityName: string;
  moveFrom: string;
  moveTo: string | null;
  status: Enums<"request_status">;
  needs: Enums<"relocation_need">[];
  createdAt: string;
  pendingOffers: number;
  acceptedOffers: number;
};

export type RequestOffer = {
  id: string;
  buddyId: string;
  buddyName: string;
  bio: string | null;
  languages: string[];
  ratingAvg: number | null;
  ratingCount: number;
  message: string | null;
  status: Enums<"offer_status">;
  createdAt: string;
  conversationId: string | null;
  myRating: { rating: number; comment: string | null } | null;
};

export type RequestDetail = {
  id: string;
  cityId: string;
  cityName: string;
  neighbourhoodIds: string[];
  moveFrom: string;
  moveTo: string | null;
  workplaceAddress: string | null;
  hasWorkplacePin: boolean;
  budgetMin: number | null;
  budgetMax: number | null;
  household: Enums<"household_type">;
  needs: Enums<"relocation_need">[];
  note: string | null;
  sameGenderOnly: boolean;
  status: Enums<"request_status">;
  createdAt: string;
  offers: RequestOffer[];
};
