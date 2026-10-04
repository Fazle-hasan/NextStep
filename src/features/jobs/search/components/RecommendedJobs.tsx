import Link from "next/link";

import { Button } from "@/components/ui/button";

import { JobCard } from "../../components/JobCard";
import { getRecommendedJobs } from "../queries";
import { searchStrings as s } from "../strings";

import { EmptyState } from "./EmptyState";

// "Recommended for you" block for the home page. Needs a signed-in user (recommended_jobs uses their profile).
export async function RecommendedJobs({ limit = 6 }: { limit?: number }) {
  const jobs = await getRecommendedJobs(limit).catch(() => null);
  // A failed recommendation query should not break the page it sits on.
  if (jobs === null) return null;

  return (
    <section aria-labelledby="recommended-jobs-heading" className="space-y-4">
      <h2 id="recommended-jobs-heading" className="text-xl font-semibold">
        {s.recommended.title}
      </h2>
      {jobs.length === 0 ? (
        <EmptyState title={s.recommended.empty} body={s.recommended.emptyBody}>
          <Button asChild className="h-11">
            <Link href="/profile">{s.recommended.cta}</Link>
          </Button>
        </EmptyState>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {jobs.map((job) => (
            <li key={job.id}>
              <JobCard job={job} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
