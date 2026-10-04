import { Badge } from "@/components/ui/badge";

import { isExpiredRequest, sessionStatusLabel, type SessionStatus } from "../../labels";

type Props = { status: SessionStatus; startsAt: string };

const VARIANTS: Record<SessionStatus, "default" | "secondary" | "outline" | "destructive"> = {
  requested: "secondary",
  confirmed: "default",
  declined: "destructive",
  cancelled: "outline",
  completed: "outline",
};

// Status chip for a session; an unanswered request whose time has passed shows as "Expired".
export function SessionStatusBadge({ status, startsAt }: Props) {
  const session = { status, starts_at: startsAt };
  return <Badge variant={isExpiredRequest(session) ? "outline" : VARIANTS[status]}>{sessionStatusLabel(session)}</Badge>;
}
