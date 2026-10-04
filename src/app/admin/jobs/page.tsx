import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { reviewJob } from "@/features/admin/actions";
import { ReviewButtons } from "@/features/admin/components/ReviewButtons";
import { getJobsPendingReview } from "@/features/admin/queries";
import { adminStrings as s } from "@/features/admin/strings";
import { formatDate } from "@/lib/utils/dates";

export const metadata: Metadata = { title: s.jobs.title };

export default async function AdminJobsPage() {
  const jobs = await getJobsPendingReview();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← {s.title}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{s.jobs.title}</h1>
        <p className="text-muted-foreground">{s.jobs.description}</p>
      </div>

      {jobs.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">{s.jobs.empty}</p>
      ) : (
        <ul className="space-y-4">
          {jobs.map((job) => (
            <li key={job.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{job.title}</CardTitle>
                  <CardDescription>
                    {job.companyName} · {formatDate(job.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="line-clamp-6 text-sm whitespace-pre-line text-muted-foreground">{job.description}</p>
                  <ReviewButtons
                    id={job.id}
                    subject={`${job.title} · ${job.companyName}`}
                    action={reviewJob}
                    rejectLabel={s.jobs.sendBack}
                    reasonRequired={false}
                  />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
