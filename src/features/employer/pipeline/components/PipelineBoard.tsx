"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { APPLICATION_STATUS_LABELS, PIPELINE_STATUSES } from "@/features/jobs/labels";
import { timeAgo } from "@/lib/utils/dates";

import { moveApplicant } from "../actions";
import type { PipelineApplicant } from "../queries";
import type { EmployerStatus } from "../schemas";
import { pipelineStrings as s } from "../strings";

import { ApplicantCard } from "./ApplicantCard";

type Props = { applicants: PipelineApplicant[] };

// Pipeline columns with a stage dropdown per applicant (optimistic, rolled back if the server refuses).
export function PipelineBoard({ applicants: initial }: Props) {
  const [applicants, setApplicants] = useState(initial);
  const [referredOnly, setReferredOnly] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onMove(applicant: PipelineApplicant, status: EmployerStatus) {
    if (applicant.status === status) return;
    const previous = applicant.status;
    const setStatus = (value: PipelineApplicant["status"]) =>
      setApplicants((list) => list.map((a) => (a.id === applicant.id ? { ...a, status: value } : a)));

    setStatus(status);
    setPendingId(applicant.id);
    startTransition(async () => {
      const result = await moveApplicant({ applicationId: applicant.id, status });
      setPendingId(null);
      if (!result.ok) {
        setStatus(previous);
        toast.error(result.error);
        return;
      }
      toast.success(s.moved(applicant.name ?? s.unnamedApplicant, APPLICATION_STATUS_LABELS[status]));
    });
  }

  if (applicants.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h2 className="font-semibold">{s.noApplicantsTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{s.noApplicantsBody}</p>
      </div>
    );
  }

  const visible = referredOnly ? applicants.filter((a) => a.referred) : applicants;
  const withdrawn = visible.filter((a) => a.status === "withdrawn");

  return (
    <div className="space-y-4">
      <div className="flex min-h-11 items-center gap-3">
        <Switch id="referred-only" checked={referredOnly} onCheckedChange={setReferredOnly} />
        <Label htmlFor="referred-only">{s.referredOnly}</Label>
      </div>

      {referredOnly && visible.length === 0 && <p className="text-sm text-muted-foreground">{s.noReferredApplicants}</p>}

      {/* Stacked on phones; side-by-side columns that scroll inside this box on wider screens. */}
      <div className="flex min-w-0 flex-col gap-4 md:snap-x md:flex-row md:overflow-x-auto md:pb-2">
        {PIPELINE_STATUSES.map((status) => {
          const inColumn = visible.filter((a) => a.status === status);
          return (
            <section
              key={status}
              aria-labelledby={`column-${status}`}
              className="space-y-3 rounded-lg bg-muted/50 p-3 md:w-72 md:shrink-0 md:snap-start"
            >
              <h2 id={`column-${status}`} className="flex items-center justify-between text-sm font-semibold">
                {APPLICATION_STATUS_LABELS[status]}
                <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium">{inColumn.length}</span>
              </h2>
              {inColumn.length === 0 ? (
                <p className="text-sm text-muted-foreground">{s.emptyColumn}</p>
              ) : (
                <ul className="space-y-3">
                  {inColumn.map((applicant) => (
                    <ApplicantCard
                      key={applicant.id}
                      applicant={applicant}
                      onMove={onMove}
                      disabled={pendingId === applicant.id}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {withdrawn.length > 0 && (
        <section aria-labelledby="column-withdrawn" className="space-y-2 rounded-lg border border-dashed p-3">
          <h2 id="column-withdrawn" className="text-sm font-semibold text-muted-foreground">
            {s.withdrawnTitle} ({withdrawn.length})
          </h2>
          <p className="text-sm text-muted-foreground">{s.withdrawnHint}</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {withdrawn.map((a) => (
              <li key={a.id}>
                <Link href={`/employer/applications/${a.id}`} className="hover:underline">
                  {a.name ?? s.unnamedApplicant}
                </Link>{" "}
                · {s.applied(timeAgo(a.appliedAt))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
