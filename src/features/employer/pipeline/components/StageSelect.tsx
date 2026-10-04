"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APPLICATION_STATUS_LABELS } from "@/features/jobs/labels";
import type { Enums } from "@/types/database";

import { EMPLOYER_STATUSES, type EmployerStatus } from "../schemas";

type Props = {
  id?: string;
  value: Enums<"application_status">;
  onChange: (status: EmployerStatus) => void;
  disabled?: boolean;
  // Accessible name when there is no visible <Label htmlFor>.
  ariaLabel?: string;
};

// Stage dropdown. "Applied" is shown only as the current value: employers cannot move someone back to it.
export function StageSelect({ id, value, onChange, disabled, ariaLabel }: Props) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as EmployerStatus)} disabled={disabled}>
      <SelectTrigger id={id} aria-label={ariaLabel} className="h-11 w-full text-base">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {value === "applied" && (
          <SelectItem value="applied" disabled>
            {APPLICATION_STATUS_LABELS.applied}
          </SelectItem>
        )}
        {EMPLOYER_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {APPLICATION_STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
