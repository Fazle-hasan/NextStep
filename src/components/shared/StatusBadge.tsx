import { CircleCheck, CircleDashed, CircleX, Clock, Loader } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// One status badge for the whole app (D-041). The same tone always means the same thing:
//   success   approved, verified, completed, confirmed, accepted, hired
//   attention pending, waiting for review, action needed
//   progress  submitted, scheduled, in progress
//   danger    rejected, declined, failed
//   inactive  draft, expired, cancelled, withdrawn, closed
// Each tone has an icon, so colour is never the only signal.
export type StatusTone = "success" | "attention" | "progress" | "danger" | "inactive";

const TONES: Record<StatusTone, { variant: "success" | "warning" | "info" | "danger" | "neutral"; Icon: typeof Clock }> = {
  success: { variant: "success", Icon: CircleCheck },
  attention: { variant: "warning", Icon: Clock },
  progress: { variant: "info", Icon: Loader },
  danger: { variant: "danger", Icon: CircleX },
  inactive: { variant: "neutral", Icon: CircleDashed },
};

// Default tone for the status values used across the database enums. Features may pass `tone` explicitly.
const STATUS_TONES: Record<string, StatusTone> = {
  approved: "success",
  verified: "success",
  completed: "success",
  confirmed: "success",
  accepted: "success",
  hired: "success",
  enrolled: "success",
  published: "success",
  active: "success",
  offer: "success",
  sent: "success",
  open: "progress",
  pending: "attention",
  pending_review: "attention",
  requested: "attention",
  waitlisted: "attention",
  applied: "progress",
  shortlisted: "progress",
  interview: "progress",
  proposed: "progress",
  selected: "success",
  rejected: "danger",
  declined: "danger",
  failed: "danger",
  draft: "inactive",
  expired: "inactive",
  cancelled: "inactive",
  withdrawn: "inactive",
  closed: "inactive",
  paused: "inactive",
  rented: "inactive",
  dismissed: "inactive",
  actioned: "success",
  skipped: "inactive",
};

export function statusTone(status: string): StatusTone {
  return STATUS_TONES[status] ?? "inactive";
}

type Props = {
  // Raw status value (e.g. "pending_review"); decides the tone unless `tone` is given.
  status?: string;
  tone?: StatusTone;
  // The visible text (already translated / humanised by the feature).
  label: string;
  className?: string;
};

export function StatusBadge({ status, tone, label, className }: Props) {
  const resolved = tone ?? (status ? statusTone(status) : "inactive");
  const { variant, Icon } = TONES[resolved];
  return (
    <Badge variant={variant} className={cn("gap-1", className)}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
