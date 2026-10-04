import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { ApplicationStatusBadge } from "@/features/jobs/applications/components/ApplicationStatusBadge";
import { getMyApplications } from "@/features/jobs/applications/queries";
import { applicationsStrings as s } from "@/features/jobs/applications/strings";
import { formatDateTime, timeAgo } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "My applications" };

export default async function ApplicationsPage() {
  const viewer = await requireViewer("/applications");
  const applications = await getMyApplications(viewer.id);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 text-center">
            <h2 className="text-base font-semibold">{s.emptyTitle}</h2>
            <p className="text-sm text-muted-foreground">{s.emptyBody}</p>
            <Button asChild className="h-11">
              <Link href="/jobs">{s.findJobs}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {applications.map((application) => (
            <li key={application.id}>
              <Card>
                <CardContent className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-base leading-snug font-semibold">
                        <Link href={`/applications/${application.id}`} className="hover:underline focus-visible:underline">
                          {application.jobTitle}
                        </Link>
                      </h2>
                      <p className="truncate text-sm text-muted-foreground">{application.companyName}</p>
                    </div>
                    <ApplicationStatusBadge status={application.status} />
                  </div>
                  <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{s.appliedOn(timeAgo(application.createdAt))}</span>
                    {application.referred && <Badge variant="outline">{s.referred}</Badge>}
                  </p>
                  {application.nextInterviewAt ? (
                    <p className="text-sm font-medium">{s.interviewOn(formatDateTime(application.nextInterviewAt))}</p>
                  ) : (
                    application.hasProposedSlots && (
                      <Link
                        href={`/applications/${application.id}`}
                        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {s.pickInterview} →
                      </Link>
                    )
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
