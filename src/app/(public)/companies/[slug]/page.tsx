import { Building2, ExternalLink, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { JobCard } from "@/features/jobs/components/JobCard";
import { COMPANY_SIZE_LABELS } from "@/features/jobs/labels";
import { EmptyState } from "@/features/jobs/search/components/EmptyState";
import { PageFrame } from "@/features/jobs/search/components/PageFrame";
import { SaveJobButton } from "@/features/jobs/search/components/SaveJobButton";
import { getCompanyBySlug, getCompanyOpenJobs, getSavedJobIds } from "@/features/jobs/search/queries";
import { searchStrings as s } from "@/features/jobs/search/strings";
import { getPublicPageViewer } from "@/features/jobs/search/viewer";
import { companyLogoUrl } from "@/lib/supabase/storage";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function generateMetadata({ params }: PageProps<"/companies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const company = SLUG.test(slug) ? await getCompanyBySlug(slug) : null;
  return { title: company?.name ?? "Company not found" };
}

export default async function CompanyPage({ params }: PageProps<"/companies/[slug]">) {
  const { slug } = await params;
  if (!SLUG.test(slug)) notFound();

  const [company, { viewer, inShell }] = await Promise.all([getCompanyBySlug(slug), getPublicPageViewer()]);
  if (!company) notFound();

  const jobs = await getCompanyOpenJobs(company.id);
  const savedIds = viewer
    ? await getSavedJobIds(
        viewer.id,
        jobs.map((job) => job.id),
      )
    : new Set<string>();

  const logo = companyLogoUrl(company.logo_path);
  const facts = [company.industry, company.size ? COMPANY_SIZE_LABELS[company.size] : null].filter(Boolean).join(" · ");
  // Only link to http(s) sites (the database also enforces this).
  const website = company.website && /^https?:\/\//.test(company.website) ? company.website : null;

  return (
    <PageFrame inShell={inShell} className="max-w-3xl space-y-6">
      <header className="flex gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- small logo served from Supabase Storage
            <img src={logo} alt="" className="size-full object-contain" />
          ) : (
            <Building2 className="size-7 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-balance">{company.name}</h1>
          {facts && <p className="text-sm text-muted-foreground">{facts}</p>}
          <div className="flex flex-wrap gap-1.5">
            {company.verification_status === "approved" && (
              <StatusBadge tone="success" label={s.company.verified} />
            )}
            {company.is_community_owned && <Badge variant="outline">{s.company.community}</Badge>}
            {company.leap_friendly && <Badge variant="outline">{s.company.leap}</Badge>}
          </div>
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {s.company.website}
              <ExternalLink className="size-3.5" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </div>
      </header>

      {company.description && (
        <section aria-labelledby="company-about" className="space-y-2">
          <h2 id="company-about" className="text-lg font-semibold">
            {s.company.about}
          </h2>
          <p className="whitespace-pre-line text-pretty">{company.description}</p>
        </section>
      )}

      {company.locations.length > 0 && (
        <section aria-labelledby="company-locations" className="space-y-2">
          <h2 id="company-locations" className="text-lg font-semibold">
            {s.company.locations}
          </h2>
          <ul className="space-y-1">
            {company.locations.map((location) => (
              <li key={location.id} className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {[location.address, location.cityName].filter(Boolean).join(", ")}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="company-jobs" className="space-y-3">
        <h2 id="company-jobs" className="text-lg font-semibold">
          {s.company.openJobs}
        </h2>
        {jobs.length === 0 ? (
          <EmptyState title={s.company.noJobs} />
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
      </section>
    </PageFrame>
  );
}
