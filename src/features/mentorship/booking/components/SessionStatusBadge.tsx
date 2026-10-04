import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";

import { isExpiredRequest, sessionStatusLabel, type SessionStatus } from "../../labels";

type Props = { status: SessionStatus; startsAt: string };

const TONES: Record<SessionStatus, StatusTone> = {
  requested: "attention",
  confirmed: "success",
  declined: "danger",
  cancelled: "inactive",
  completed: "success",
};

// Status chip for a session; an unanswered request whose time has passed shows as "Expired".
export function SessionStatusBadge({ status, startsAt }: Props) {
  const session = { status, starts_at: startsAt };
  return <StatusBadge tone={isExpiredRequest(session) ? "inactive" : TONES[status]} label={sessionStatusLabel(session)} />;
}
