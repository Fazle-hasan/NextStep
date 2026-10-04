import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";
import type { Enums } from "@/types/database";

import { OFFER_STATUS_LABELS, REQUEST_STATUS_LABELS } from "../labels";

const REQUEST_TONES: Record<Enums<"request_status">, StatusTone> = {
  open: "progress",
  closed: "success",
  cancelled: "inactive",
};

const OFFER_TONES: Record<Enums<"offer_status">, StatusTone> = {
  pending: "attention",
  accepted: "success",
  declined: "danger",
  withdrawn: "inactive",
};

export function RequestStatusBadge({ status }: { status: Enums<"request_status"> }) {
  return <StatusBadge tone={REQUEST_TONES[status]} label={REQUEST_STATUS_LABELS[status]} />;
}

export function OfferStatusBadge({ status }: { status: Enums<"offer_status"> }) {
  return <StatusBadge tone={OFFER_TONES[status]} label={OFFER_STATUS_LABELS[status]} />;
}
