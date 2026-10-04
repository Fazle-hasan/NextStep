import { Building2, MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { companyLogoUrl } from "@/lib/supabase/storage";
import { timeAgo } from "@/lib/utils/dates";
import { formatAnnualSalary } from "@/lib/utils/money";

import { EXPERIENCE_LEVEL_LABELS, JOB_TYPE_LABELS, WORK_MODE_LABELS } from "../labels";
import type { JobCardData } from "../types";

type Props = {
  job: JobCardData;
  // Optional control shown in the corner, e.g. a save button.
  action?: React.ReactNode;
};

// Summary card used in search results, saved jobs, recommendations and company pages.
export function JobCard({ job, action }: Props) {
  const logo = companyLogoUrl(job.company_logo_path);
  const salary = formatAnnualSalary(job.salary_min, job.salary_max);
  const place =
    [job.neighbourhood_name, job.city_name].filter(Boolean).join(", ") || (job.work_mode === "remote" ? "Remote" : null);

  return (
    <Card>
      <CardContent className="flex gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- small logo served from Supabase Storage
            <img src={logo} alt="" className="size-full object-contain" />
          ) : (
            <Building2 className="size-5 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base leading-snug font-semibold">
                <Link href={`/jobs/${job.id}`} className="hover:underline focus-visible:underline">
                  {job.title}
                </Link>
              </h3>
              <p className="truncate text-sm text-muted-foreground">
                <Link href={`/companies/${job.company_slug}`} className="hover:underline">
                  {job.company_name}
                </Link>
              </p>
            </div>
            {action}
          </div>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {place && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden="true" />
                {place}
                {job.distance_km != null && ` · ${job.distance_km} km away`}
              </span>
            )}
            {salary && <span className="font-medium text-foreground">{salary}</span>}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{JOB_TYPE_LABELS[job.job_type]}</Badge>
            <Badge variant="secondary">{WORK_MODE_LABELS[job.work_mode]}</Badge>
            <Badge variant="secondary">{EXPERIENCE_LEVEL_LABELS[job.experience_level]}</Badge>
            {job.leap_friendly && <Badge variant="outline">LEAP-friendly</Badge>}
            {job.is_community_owned && <Badge variant="outline">Community business</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">Posted {timeAgo(job.published_at)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
