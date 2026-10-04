import { Badge } from "@/components/ui/badge";
import type { Enums } from "@/types/database";

import { APPLICATION_STATUS_LABELS } from "../../labels";

type Status = Enums<"application_status">;

const VARIANTS: Record<Status, "default" | "secondary" | "outline" | "destructive"> = {
  applied: "secondary",
  shortlisted: "default",
  interview: "default",
  offer: "default",
  hired: "default",
  rejected: "outline",
  withdrawn: "outline",
};

export function ApplicationStatusBadge({ status }: { status: Status }) {
  return <Badge variant={VARIANTS[status]}>{APPLICATION_STATUS_LABELS[status]}</Badge>;
}
