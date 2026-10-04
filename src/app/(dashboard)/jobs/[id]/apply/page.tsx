import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { ApplyForm } from "@/features/jobs/applications/components/ApplyForm";
import { getApplyContext } from "@/features/jobs/applications/queries";
import { parseReferralParam } from "@/features/jobs/applications/schemas";
import { applyStrings as s } from "@/features/jobs/applications/strings";
import { formatDate } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Apply" };

export default async function ApplyPage({ params, searchParams }: PageProps<"/jobs/[id]/apply">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const referralId = parseReferralParam(query.ref);
  const viewer = await requireViewer(`/jobs/${id}/apply${referralId ? `?ref=${referralId}` : ""}`);

  const context = await getApplyContext(id, viewer.id);
  if (!context) notFound();
  const { job, questions, cvs, existingApplicationId } = context;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <Link href={`/jobs/${job.id}`} className="text-sm text-primary underline-offset-4 hover:underline">
        ← {s.backToJob}
      </Link>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <h1>{s.title(job.title)}</h1>
          </CardTitle>
          <CardDescription>
            {job.companyName}
            {job.deadline && job.isOpen && ` · ${s.deadline(formatDate(job.deadline))}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {existingApplicationId ? (
            <Notice
              title={s.alreadyAppliedTitle}
              href={`/applications/${existingApplicationId}`}
              action={s.viewApplication}
            />
          ) : !job.isOpen ? (
            <Notice title={s.closedTitle} body={s.closedBody} href="/jobs" action={s.browseJobs} />
          ) : cvs.length === 0 ? (
            <Notice title={s.noCvTitle} body={s.noCvBody} href="/profile" action={s.goToProfile} />
          ) : (
            <ApplyForm jobId={job.id} questions={questions} cvs={cvs} referralId={referralId} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Notice({ title, body, href, action }: { title: string; body?: string; href: string; action: string }) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {body && <p className="text-sm text-muted-foreground">{body}</p>}
      <Button asChild className="h-11">
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  );
}
