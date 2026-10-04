import { Building2 } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JOB_STATUS_LABELS, VERIFICATION_STATUS_LABELS } from "@/features/jobs/labels";
import { companyLogoUrl } from "@/lib/supabase/storage";
import { formatDate } from "@/lib/utils/dates";

import { employerStrings } from "../strings";
import type { EmployerCompany } from "../types";

import { AffiliationList } from "./AffiliationList";
import { JobRowActions } from "./JobRowActions";
import { RequestVerificationDialog } from "./RequestVerificationDialog";

const s = employerStrings.dashboard;

const HELP = { pending: s.pendingHelp, approved: s.approvedHelp, rejected: s.rejectedHelp } as const;

// One company on the employer dashboard: verification state, jobs and declared employees.
export function CompanyCard({ company, jobs, affiliations, rejectionReason }: EmployerCompany) {
  const logo = companyLogoUrl(company.logo_path);
  const status = company.verification_status;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element -- small logo served from Supabase Storage
              <img src={logo} alt="" className="size-full object-contain" />
            ) : (
              <Building2 className="size-6 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg break-words">
              <h2>{company.name}</h2>
            </CardTitle>
            <StatusBadge status={status} label={VERIFICATION_STATUS_LABELS[status]} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{HELP[status]}</p>
        {status === "rejected" && rejectionReason && <p className="text-sm">{s.rejectionReason(rejectionReason)}</p>}
        {company.hidden_at && (
          <Alert variant="destructive">
            <AlertDescription>{s.hidden}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          {status === "rejected" && <RequestVerificationDialog companyId={company.id} />}
          <Button asChild className="h-11">
            <Link href={`/employer/jobs/new?company=${company.id}`}>{s.postJob}</Link>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <Link href={`/employer/company/${company.id}/edit`}>{s.editCompany}</Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <section aria-labelledby={`jobs-${company.id}`} className="space-y-3">
          <h3 id={`jobs-${company.id}`} className="font-semibold">
            {s.jobsTitle}
          </h3>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{s.noJobs}</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {jobs.map((job) => (
                <li key={job.id} className="space-y-3 p-3">
                  <div className="space-y-1">
                    <p className="font-medium break-words">{job.title}</p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <StatusBadge status={job.status} label={JOB_STATUS_LABELS[job.status]} />
                      <span>{s.applicants(job.applicantCount)}</span>
                      <span>
                        {job.application_deadline ? s.deadline(formatDate(job.application_deadline)) : s.noDeadline}
                      </span>
                    </p>
                  </div>
                  <JobRowActions jobId={job.id} status={job.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby={`people-${company.id}`} className="space-y-3">
          <div className="space-y-1">
            <h3 id={`people-${company.id}`} className="font-semibold">
              {employerStrings.affiliations.title}
            </h3>
            <p className="text-sm text-muted-foreground">{employerStrings.affiliations.help}</p>
          </div>
          <AffiliationList affiliations={affiliations} />
        </section>
      </CardContent>
    </Card>
  );
}
