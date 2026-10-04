import type { Metadata } from "next";

import { JobCard } from "@/features/jobs/components/JobCard";
import { EmptyState } from "@/features/jobs/search/components/EmptyState";
import { JobFiltersForm } from "@/features/jobs/search/components/JobFiltersForm";
import { PageFrame } from "@/features/jobs/search/components/PageFrame";
import { SaveJobButton } from "@/features/jobs/search/components/SaveJobButton";
import { SaveSearchDialog } from "@/features/jobs/search/components/SaveSearchDialog";
import { SearchPagination } from "@/features/jobs/search/components/SearchPagination";
import { getSavedJobIds, searchJobs } from "@/features/jobs/search/queries";
import { countActiveFilters, parseJobSearch, summarizeFilters } from "@/features/jobs/search/schemas";
import { searchStrings as s } from "@/features/jobs/search/strings";
import { getPublicPageViewer } from "@/features/jobs/search/viewer";
import { getActiveCities } from "@/features/profiles/queries";

export const metadata: Metadata = { title: s.title };

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const { filters, page } = parseJobSearch(await searchParams);
  const [{ viewer, inShell }, cities, { jobs, total }] = await Promise.all([
    getPublicPageViewer(),
    getActiveCities(),
    searchJobs(filters, page),
  ]);
  const savedIds = viewer
    ? await getSavedJobIds(
        viewer.id,
        jobs.map((job) => job.id),
      )
    : new Set<string>();

  const hasFilters = countActiveFilters(filters) > 0 || Boolean(filters.q);
  const cityNames = Object.fromEntries(cities.map((city) => [city.id, city.name]));
  const summary = summarizeFilters(filters, cityNames);

  return (
    <PageFrame inShell={inShell} className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{s.title}</h1>
        <p className="text-muted-foreground">{s.subtitle}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
        <aside aria-label={s.filters}>
          {/* The key resets the uncontrolled inputs when the URL filters change (e.g. "Clear all"). */}
          <JobFiltersForm key={JSON.stringify(filters)} filters={filters} cities={cities} />
        </aside>

        <section aria-labelledby="results-heading" className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="results-heading" className="text-base font-medium" aria-live="polite">
              {s.results(total)}
            </h2>
            {viewer && hasFilters && (
              <SaveSearchDialog key={summary} filters={filters} suggestedName={summary.slice(0, 80)} />
            )}
          </div>

          {jobs.length === 0 ? (
            <EmptyState title={s.emptyTitle} body={hasFilters ? s.emptyBody : s.emptyNoFilters} />
          ) : (
            <ul className="space-y-3">
              {jobs.map((job) => (
                <li key={job.id}>
                  <JobCard
                    job={job}
                    action={viewer ? <SaveJobButton jobId={job.id} initialSaved={savedIds.has(job.id)} /> : undefined}
                  />
                </li>
              ))}
            </ul>
          )}

          <SearchPagination filters={filters} page={page} total={total} />
        </section>
      </div>
    </PageFrame>
  );
}
