import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { JobCard } from "@/features/jobs/components/JobCard";
import { searchJobs } from "@/features/jobs/search/queries";
import { parseJobSearch } from "@/features/jobs/search/schemas";

import { shellStrings } from "../strings";

const s = shellStrings.landing;

// The three newest public jobs. Renders nothing when there are none or the query fails,
// so the landing page never breaks because of it.
export async function LatestJobs() {
  const result = await searchJobs(parseJobSearch({}).filters, 1).catch(() => null);
  const jobs = result?.jobs.slice(0, 3) ?? [];
  if (jobs.length === 0) return null;

  return (
    <section aria-labelledby="latest-jobs-heading" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h2 id="latest-jobs-heading" className="text-xl font-semibold md:text-2xl">
          {s.latestJobsHeading}
        </h2>
        <Link
          href="/jobs"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {s.seeAllJobs}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <ul className="grid gap-3 md:grid-cols-3">
        {jobs.map((job) => (
          <li key={job.id}>
            <JobCard job={job} />
          </li>
        ))}
      </ul>
    </section>
  );
}
