import type { Enums } from "@/types/database";

export type BuddyProfile = {
  cityId: string;
  neighbourhoodIds: string[];
  bio: string | null;
  languages: string[];
  helpTypes: Enums<"relocation_need">[];
  isActive: boolean;
  verificationStatus: Enums<"verification_status">;
  rejectionReason: string | null;
  ratingAvg: number | null;
  ratingCount: number;
};

// A newcomer's request as an eligible buddy sees it. Never includes phone or email.
export type OpenRequest = {
  id: string;
  requesterId: string;
  requesterFirstName: string;
  cityName: string;
  areaNames: string[];
  moveFrom: string;
  moveTo: string | null;
  household: Enums<"household_type">;
  needs: Enums<"relocation_need">[];
  budgetMin: number | null;
  budgetMax: number | null;
  workplaceAddress: string | null;
  note: string | null;
  createdAt: string;
};

export type MyOffer = {
  id: string;
  requestId: string;
  requesterFirstName: string;
  cityName: string;
  requestStatus: Enums<"request_status"> | null;
  status: Enums<"offer_status">;
  message: string | null;
  createdAt: string;
  conversationId: string | null;
};
