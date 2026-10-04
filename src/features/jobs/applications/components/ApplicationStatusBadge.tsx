import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";
import type { Enums } from "@/types/database";

import { APPLICATION_STATUS_LABELS } from "../../labels";

type Status = Enums<"application_status">;

// Tones by what the status means for the applicant (D-041).
const TONES: Record<Status, StatusTone> = {
  applied: "progress",
  shortlisted: "progress",
  interview: "progress",
  offer: "success",
  hired: "success",
  rejected: "danger",
  withdrawn: "inactive",
};

export function ApplicationStatusBadge({ status }: { status: Status }) {
  return <StatusBadge tone={TONES[status]} label={APPLICATION_STATUS_LABELS[status]} />;
}
