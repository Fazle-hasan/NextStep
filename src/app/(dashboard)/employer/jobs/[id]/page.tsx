import { ArrowLeft, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/features/auth/queries";
import { PipelineBoard } from "@/features/employer/pipeline/components/PipelineBoard";
import { getPipeline } from "@/features/employer/pipeline/queries";
import { pipelineStrings as s } from "@/features/employer/pipeline/strings";
import { JOB_STATUS_LABELS } from "@/features/jobs/labels";

export const metadata: Metadata = { title: s.applicantsTitle };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EmployerJobPipelinePage({ params }: PageProps<"/employer/jobs/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  await requireViewer(`/employer/jobs/${id}`);

  const job = await getPipeline(id);
  if (!job) notFound();

  return (
    <div className="min-w-0 space-y-6">
      <div className="space-y-3">
        <Link href="/employer" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {s.backToDashboard}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight break-words">{job.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={job.status === "published" ? "default" : "secondary"}>{JOB_STATUS_LABELS[job.status]}</Badge>
              <span className="text-sm text-muted-foreground">
                {s.applicantsTitle}: {job.applicants.length}
              </span>
            </div>
          </div>
          <Button asChild variant="outline" className="h-11">
            <Link href={`/employer/jobs/${job.id}/edit`}>
              <Pencil aria-hidden="true" />
              {s.editJob}
            </Link>
          </Button>
        </div>
      </div>

      <PipelineBoard applicants={job.applicants} />
    </div>
  );
}
