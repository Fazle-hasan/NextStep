import type { Enums } from "@/types/database";

// Display labels for Settle In enums (one place, so they can be translated later).

export const NEED_LABELS: Record<Enums<"relocation_need">, string> = {
  flat: "Finding a flat",
  flatmate: "Finding a flatmate",
  area_guidance: "Getting to know the area",
  nearby_masjid: "Nearby masjid / imambargah",
  halal_food: "Halal food",
  pickup: "Airport / station pickup",
  temporary_stay: "A temporary place to stay",
  general_advice: "General advice",
};

export const HOUSEHOLD_LABELS: Record<Enums<"household_type">, string> = {
  alone: "Moving alone",
  family: "Moving with family",
  with_flatmates: "Looking for flatmates",
};

export const REQUEST_STATUS_LABELS: Record<Enums<"request_status">, string> = {
  open: "Open",
  closed: "Settled",
  cancelled: "Cancelled",
};

export const OFFER_STATUS_LABELS: Record<Enums<"offer_status">, string> = {
  pending: "Waiting for a reply",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
};
