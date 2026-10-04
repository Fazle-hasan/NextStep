import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { ApplicantProfile } from "@/features/employer/pipeline/components/ApplicantProfile";
import { ApplicantStageForm } from "@/features/employer/pipeline/components/ApplicantStageForm";
import { ApplicationSubmission } from "@/features/employer/pipeline/components/ApplicationSubmission";
import { InterviewSlotsPanel } from "@/features/employer/pipeline/components/InterviewSlotsPanel";
import { NotesPanel } from "@/features/employer/pipeline/components/NotesPanel";
import { ViewCvButton } from "@/features/employer/pipeline/components/ViewCvButton";
import { getApplicantDetail } from "@/features/employer/pipeline/queries";
import { pipelineStrings as s } from "@/features/employer/pipeline/strings";
import { APPLICATION_STATUS_LABELS } from "@/features/jobs/labels";
import { timeAgo } from "@/lib/utils/dates";

export const metadata: Metadata = { title: s.viewApplicant };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EmployerApplicationPage({ params }: PageProps<"/employer/applications/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const viewer = await requireViewer(`/employer/applications/${id}`);

  const detail = await getApplicantDetail(id, viewer.id);
  if (!detail) notFound();

  const { application, job } = detail;
  const withdrawn = application.status === "withdrawn";
  const closed = withdrawn || application.status === "rejected" || application.status === "hired";

  return (
    <div className="mx-auto max-w-3xl min-w-0 space-y-6">
      <div className="space-y-3">
        <Link
          href={`/employer/jobs/${job.id}`}
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {s.backToPipeline}
        </Link>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{detail.name ?? s.unnamedApplicant}</h1>
          {detail.seekerProfile?.headline && <p className="break-words text-muted-foreground">{detail.seekerProfile.headline}</p>}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge>{APPLICATION_STATUS_LABELS[application.status]}</Badge>
            {detail.referral && <Badge variant="outline">{s.referred}</Badge>}
            <span className="break-words">
              {job.title} · {s.applied(timeAgo(application.created_at))}
            </span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{s.statusLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplicantStageForm key={application.status} applicationId={application.id} status={application.status} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{s.cvTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.hasCv ? (
            <ViewCvButton applicationId={application.id} />
          ) : (
            <p className="text-sm text-muted-foreground">{s.cvUnavailable}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{s.profileTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <ApplicationSubmission detail={detail} />
          <ApplicantProfile detail={detail} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{s.slotsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <InterviewSlotsPanel applicationId={application.id} slots={detail.slots} closed={closed} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{s.notesTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <NotesPanel applicationId={application.id} notes={detail.notes} />
        </CardContent>
      </Card>
    </div>
  );
}
