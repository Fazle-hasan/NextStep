import { ArrowLeft, Building2, CalendarClock, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { EXPERIENCE_LEVEL_LABELS, JOB_TYPE_LABELS, WORK_MODE_LABELS } from "@/features/jobs/labels";
import { JobActions } from "@/features/jobs/search/components/JobActions";
import { PageFrame } from "@/features/jobs/search/components/PageFrame";
import { getJobDetail, getSavedJobIds, hasAppliedToJob } from "@/features/jobs/search/queries";
import { searchStrings as s } from "@/features/jobs/search/strings";
import { getPublicPageViewer } from "@/features/jobs/search/viewer";
import { isMapConfigured, MapView, parseEwkbPoint } from "@/lib/maps";
import { companyLogoUrl } from "@/lib/supabase/storage";
import { formatDate, timeAgo } from "@/lib/utils/dates";
import { formatAnnualSalary } from "@/lib/utils/money";

const uuid = z.guid();

export async function generateMetadata({ params }: PageProps<"/jobs/[id]">): Promise<Metadata> {
  const { id } = await params;
  const job = uuid.safeParse(id).success ? await getJobDetail(id) : null;
  return { title: job ? `${job.title} at ${job.company.name}` : s.detail.notFoundTitle };
}

export default async function JobPage({ params, searchParams }: PageProps<"/jobs/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!uuid.safeParse(id).success) notFound();

  const [job, { viewer, inShell }] = await Promise.all([getJobDetail(id), getPublicPageViewer()]);
  if (!job) notFound();

  const [applied, savedIds] = viewer
    ? await Promise.all([hasAppliedToJob(job.id, viewer.id), getSavedJobIds(viewer.id, [job.id])])
    : [false, new Set<string>()];

  // A referral code from a shared link is passed on to the apply page.
  const ref = typeof query.ref === "string" && uuid.safeParse(query.ref).success ? query.ref : null;
  const isOpen = job.status === "published" && (!job.expires_at || new Date(job.expires_at) > new Date());
  const logo = companyLogoUrl(job.company.logo_path);
  const salary = job.salary ? formatAnnualSalary(job.salary.min, job.salary.max) : null;
  const place = [job.address_text, job.neighbourhoodName, job.cityName].filter(Boolean).join(", ");
  // Remote jobs have no place to show; other jobs carry a pin or the centre of their neighbourhood or city.
  const point = job.work_mode !== "remote" && isMapConfigured() ? parseEwkbPoint(job.location) : null;

  return (
    <PageFrame inShell={inShell} className="max-w-3xl space-y-6">
      <Link href="/jobs" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {s.detail.backToSearch}
      </Link>

      <header className="flex gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- small logo served from Supabase Storage
            <img src={logo} alt="" className="size-full object-contain" />
          ) : (
            <Building2 className="size-6 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-balance">{job.title}</h1>
          <p>
            <Link href={`/companies/${job.company.slug}`} className="font-medium text-primary hover:underline">
              {job.company.name}
            </Link>
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{JOB_TYPE_LABELS[job.job_type]}</Badge>
            <Badge variant="secondary">{WORK_MODE_LABELS[job.work_mode]}</Badge>
            <Badge variant="secondary">{EXPERIENCE_LEVEL_LABELS[job.experience_level]}</Badge>
            {job.company.leap_friendly && <Badge variant="outline">{s.company.leap}</Badge>}
            {job.company.is_community_owned && <Badge variant="outline">{s.company.community}</Badge>}
          </div>
        </div>
      </header>

      {!isOpen && (
        <Alert>
          <AlertDescription>{s.detail.closed}</AlertDescription>
        </Alert>
      )}

      <dl className="grid gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Salary</dt>
          <dd className="text-base font-semibold">{salary ?? s.detail.salaryHidden}</dd>
        </div>
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" aria-hidden="true" />
          <dt className="sr-only">Openings</dt>
          <dd>{s.detail.openings(job.openings)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-muted-foreground" aria-hidden="true" />
          <dt className="sr-only">Dates</dt>
          <dd>
            {s.detail.posted(timeAgo(job.published_at ?? job.created_at))}
            {job.application_deadline && ` · ${s.detail.deadline(formatDate(job.application_deadline))}`}
          </dd>
        </div>
      </dl>

      <JobActions jobId={job.id} isOpen={isOpen} signedIn={viewer !== null} applied={applied} saved={savedIds.has(job.id)} referral={ref} />

      <section aria-labelledby="job-description" className="space-y-2">
        <h2 id="job-description" className="text-lg font-semibold">
          {s.detail.description}
        </h2>
        <p className="whitespace-pre-line text-pretty">{job.description}</p>
        {job.questionCount > 0 && isOpen && (
          <p className="text-sm text-muted-foreground">{s.detail.questions(job.questionCount)}</p>
        )}
      </section>

      {job.requirements && (
        <section aria-labelledby="job-requirements" className="space-y-2">
          <h2 id="job-requirements" className="text-lg font-semibold">
            {s.detail.requirements}
          </h2>
          <p className="whitespace-pre-line text-pretty">{job.requirements}</p>
        </section>
      )}

      {job.skills.length > 0 && (
        <section aria-labelledby="job-skills" className="space-y-2">
          <h2 id="job-skills" className="text-lg font-semibold">
            {s.detail.skills}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <li key={skill}>
                <Badge variant="secondary" className="h-7 text-sm">
                  {skill}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="job-location" className="space-y-2">
        <h2 id="job-location" className="text-lg font-semibold">
          {s.detail.location}
        </h2>
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {place || (job.work_mode === "remote" ? s.detail.remote : "—")}
        </p>
        {point && (
          <MapView
            markers={[{ id: job.id, kind: "job", lat: point.lat, lng: point.lng, label: s.detail.mapMarker }]}
            center={point}
            zoom={13}
            ariaLabel={s.detail.mapLabel(job.title)}
            className="h-56"
          />
        )}
        <p>
          <Link href="/location-gathering" className="inline-flex min-h-11 items-center font-medium text-primary hover:underline">
            {s.detail.relocate}
          </Link>
        </p>
      </section>

      {job.company.description && (
        <section aria-labelledby="job-company" className="space-y-2">
          <h2 id="job-company" className="text-lg font-semibold">
            {s.detail.aboutCompany}
          </h2>
          <p className="whitespace-pre-line text-pretty">{job.company.description}</p>
        </section>
      )}
    </PageFrame>
  );
}
