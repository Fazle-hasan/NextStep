import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireViewer } from "@/features/auth/queries";
import { JobCard } from "@/features/jobs/components/JobCard";
import { EmptyState } from "@/features/jobs/search/components/EmptyState";
import { SavedSearchItem } from "@/features/jobs/search/components/SavedSearchItem";
import { SaveJobButton } from "@/features/jobs/search/components/SaveJobButton";
import { getSavedJobs, getSavedSearches } from "@/features/jobs/search/queries";
import { jobsHref, summarizeFilters } from "@/features/jobs/search/schemas";
import { searchStrings as s } from "@/features/jobs/search/strings";
import { getActiveCities } from "@/features/profiles/queries";

export const metadata: Metadata = { title: s.saved.title };

export default async function SavedPage({ searchParams }: PageProps<"/saved">) {
  const viewer = await requireViewer("/saved");
  const [params, savedJobs, savedSearches, cities] = await Promise.all([
    searchParams,
    getSavedJobs(viewer.id),
    getSavedSearches(viewer.id),
    getActiveCities(),
  ]);
  const cityNames = Object.fromEntries(cities.map((city) => [city.id, city.name]));
  const tab = params.tab === "searches" ? "searches" : "jobs";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{s.saved.title}</h1>

      <Tabs defaultValue={tab}>
        <TabsList className="grid h-11 w-full grid-cols-2">
          <TabsTrigger value="jobs">
            {s.saved.jobsTab} ({savedJobs.length})
          </TabsTrigger>
          <TabsTrigger value="searches">
            {s.saved.searchesTab} ({savedSearches.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="pt-4">
          {savedJobs.length === 0 ? (
            <EmptyState title={s.saved.noJobsTitle} body={s.saved.noJobsBody}>
              <Button asChild className="h-11">
                <Link href="/jobs">{s.saved.browse}</Link>
              </Button>
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {savedJobs.map(({ savedId, jobId, job }) => (
                <li key={savedId} className="space-y-1">
                  {job ? (
                    <>
                      <JobCard job={job} action={<SaveJobButton jobId={jobId} initialSaved refreshOnChange />} />
                      {job.status !== "published" && <p className="px-1 text-sm text-muted-foreground">{s.saved.notOpen}</p>}
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed p-4">
                      <p className="text-sm text-muted-foreground">{s.saved.unavailable}</p>
                      <SaveJobButton jobId={jobId} initialSaved refreshOnChange />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="searches" className="pt-4">
          {savedSearches.length === 0 ? (
            <EmptyState title={s.saved.noSearchesTitle} body={s.saved.noSearchesBody}>
              <Button asChild className="h-11">
                <Link href="/jobs">{s.saved.browse}</Link>
              </Button>
            </EmptyState>
          ) : (
            <ul className="space-y-3">
              {savedSearches.map((search) => (
                <li key={search.id}>
                  <SavedSearchItem
                    id={search.id}
                    name={search.name}
                    summary={summarizeFilters(search.filters, cityNames)}
                    href={jobsHref(search.filters)}
                    daily={search.daily}
                  />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
