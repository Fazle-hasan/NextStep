import { Badge } from "@/components/ui/badge";
import type { Enums } from "@/types/database";

import { OFFER_STATUS_LABELS, REQUEST_STATUS_LABELS } from "../labels";

export function RequestStatusBadge({ status }: { status: Enums<"request_status"> }) {
  return <Badge variant={status === "open" ? "default" : "secondary"}>{REQUEST_STATUS_LABELS[status]}</Badge>;
}

export function OfferStatusBadge({ status }: { status: Enums<"offer_status"> }) {
  const variant = status === "accepted" ? "default" : status === "pending" ? "outline" : "secondary";
  return <Badge variant={variant}>{OFFER_STATUS_LABELS[status]}</Badge>;
}
