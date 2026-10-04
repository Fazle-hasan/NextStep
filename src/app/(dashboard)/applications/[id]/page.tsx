import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { ApplicationStatusBadge } from "@/features/jobs/applications/components/ApplicationStatusBadge";
import { InterviewSlots, type SlotView } from "@/features/jobs/applications/components/InterviewSlots";
import { WithdrawButton } from "@/features/jobs/applications/components/WithdrawButton";
import { getMyApplication } from "@/features/jobs/applications/queries";
import { applicationsStrings as s } from "@/features/jobs/applications/strings";
import { APPLICATION_STATUS_LABELS } from "@/features/jobs/labels";
import { formatDateTime } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Application" };

export default async function ApplicationPage({ params }: PageProps<"/applications/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const viewer = await requireViewer(`/applications/${id}`);
  const application = await getMyApplication(id, viewer.id);
  if (!application) notFound();

  const isOpen = !["withdrawn", "rejected", "hired"].includes(application.status);
  const slots: SlotView[] = application.slots.flatMap((slot) =>
    slot.status === "cancelled"
      ? []
      : [{ id: slot.id, when: formatDateTime(slot.starts_at), location: slot.location_or_link, status: slot.status }],
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <Link href="/applications" className="text-sm text-primary underline-offset-4 hover:underline">
        ← {s.back}
      </Link>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{application.job.title}</h1>
        <p className="text-muted-foreground">{application.job.companyName}</p>
        <div className="flex flex-wrap items-center gap-2">
          <ApplicationStatusBadge status={application.status} />
          {application.referred && <Badge variant="outline">{s.referred}</Badge>}
          <Link href={`/jobs/${application.job.id}`} className="text-sm text-primary underline-offset-4 hover:underline">
            {s.viewJob}
          </Link>
        </div>
      </header>

      {slots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{s.interviewTitle}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InterviewSlots slots={slots} canPick={isOpen} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{s.timelineTitle}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 border-l pl-4">
            {application.history.map((entry) => (
              <li key={entry.id} className="space-y-0.5">
                <p className="font-medium">
                  {entry.from_status === null ? s.timelineStart : s.timelineChange(APPLICATION_STATUS_LABELS[entry.to_status])}
                </p>
                <p className="text-sm text-muted-foreground">{formatDateTime(entry.created_at)}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{s.detailsTitle}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4 text-sm">
            <div className="space-y-1">
              <dt className="font-medium">{s.cv}</dt>
              <dd className="break-all text-muted-foreground">{application.cvFileName ?? s.cvRemoved}</dd>
            </div>
            <div className="space-y-1">
              <dt className="font-medium">{s.coverNote}</dt>
              <dd className="break-words whitespace-pre-line text-muted-foreground">
                {application.coverNote ?? s.noCoverNote}
              </dd>
            </div>
            {application.answers.length > 0 && (
              <div className="space-y-2">
                <dt className="font-medium">{s.answers}</dt>
                <dd>
                  <ul className="space-y-2">
                    {application.answers.map((item) => (
                      <li key={item.question} className="space-y-0.5">
                        <p>{item.question}</p>
                        <p className="break-words whitespace-pre-line text-muted-foreground">{item.answer}</p>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {isOpen && <WithdrawButton applicationId={application.id} />}
    </div>
  );
}
