import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { BackToEmployer } from "@/features/employer/components/BackToEmployer";
import { JobForm } from "@/features/employer/components/JobForm";
import { jobDefaults } from "@/features/employer/defaults";
import { getJobForEdit } from "@/features/employer/queries";
import { employerStrings } from "@/features/employer/strings";
import { JOB_STATUS_LABELS } from "@/features/jobs/labels";
import { getNeighbourhoods, getSkills } from "@/features/jobs/queries";
import { getActiveCities } from "@/features/profiles/queries";

const s = employerStrings.job;

export const metadata: Metadata = { title: s.editTitle };

export default async function EditJobPage({ params }: PageProps<"/employer/jobs/[id]/edit">) {
  const { id } = await params;
  const viewer = await requireViewer(`/employer/jobs/${id}/edit`);
  if (!z.uuid().safeParse(id).success) notFound();

  const data = await getJobForEdit(viewer.id, id);
  if (!data) notFound();
  const { job, company } = data;
  const [cities, neighbourhoods, skills] = await Promise.all([getActiveCities(), getNeighbourhoods(), getSkills()]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BackToEmployer />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <h1>{s.editTitle}</h1>
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span>{s.forCompany(company.name)}</span>
            <Badge variant="secondary">{JOB_STATUS_LABELS[job.status]}</Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobForm
            jobId={job.id}
            status={job.status}
            questionsLocked={data.hasApplications}
            companyId={company.id}
            companyVerified={company.verification_status === "approved" && !company.hidden_at}
            defaults={jobDefaults(data)}
            cities={cities}
            neighbourhoods={neighbourhoods}
            skills={skills}
          />
        </CardContent>
      </Card>
    </div>
  );
}
