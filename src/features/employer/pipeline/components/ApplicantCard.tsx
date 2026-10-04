"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils/dates";

import type { PipelineApplicant } from "../queries";
import type { EmployerStatus } from "../schemas";
import { pipelineStrings as s } from "../strings";

import { StageSelect } from "./StageSelect";

type Props = {
  applicant: PipelineApplicant;
  onMove: (applicant: PipelineApplicant, status: EmployerStatus) => void;
  disabled?: boolean;
};

export function ApplicantCard({ applicant, onMove, disabled }: Props) {
  const name = applicant.name ?? s.unnamedApplicant;

  return (
    <li className="space-y-3 rounded-lg border bg-card p-3">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/employer/applications/${applicant.id}`}
            className="min-w-0 font-medium break-words hover:underline focus-visible:underline"
          >
            {name}
          </Link>
          {applicant.referred && <Badge variant="outline">{s.referred}</Badge>}
        </div>
        {applicant.headline && <p className="text-sm break-words text-muted-foreground">{applicant.headline}</p>}
        <p className="text-xs text-muted-foreground">{s.applied(timeAgo(applicant.appliedAt))}</p>
      </div>
      <StageSelect
        value={applicant.status}
        ariaLabel={s.statusFor(name)}
        disabled={disabled}
        onChange={(status) => onMove(applicant, status)}
      />
    </li>
  );
}
