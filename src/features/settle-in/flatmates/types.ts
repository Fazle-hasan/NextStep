import type { Enums, Tables } from "@/types/database";

export type FlatmateProfile = Tables<"flatmate_profiles">;
export type ConnectionStatus = Enums<"offer_status">;

export type NeighbourhoodOption = { id: string; name: string; cityId: string };

// One row of the match list (get_flatmate_matches), plus the chat link when already connected.
export type FlatmateMatch = {
  userId: string;
  fullName: string | null;
  gender: Enums<"gender"> | null;
  score: number;
  neighbourhoodIds: string[];
  budgetMin: number;
  budgetMax: number;
  moveDate: string;
  foodHabit: Enums<"food_habit">;
  smokes: boolean;
  sleepSchedule: Enums<"sleep_schedule">;
  workSchedule: Enums<"work_schedule">;
  cleanliness: number;
  guestsPolicy: Enums<"guests_policy">;
  bio: string | null;
  connectionStatus: ConnectionStatus | null;
  conversationId: string | null;
};

export type ConnectionRequest = {
  id: string;
  otherUserId: string;
  otherName: string | null;
  message: string | null;
  status: ConnectionStatus;
  createdAt: string;
  conversationId: string | null;
};

export type ConnectionRequests = { incoming: ConnectionRequest[]; sent: ConnectionRequest[] };
