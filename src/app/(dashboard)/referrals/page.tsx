import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { AffiliationManager } from "@/features/jobs/applications/components/AffiliationManager";
import { ReferralJobItem } from "@/features/jobs/applications/components/ReferralJobItem";
import { getReferralsData } from "@/features/jobs/applications/queries";
import { referralsStrings as s } from "@/features/jobs/applications/strings";
import { publicEnv } from "@/lib/env";

export const metadata: Metadata = { title: "Refer someone" };

export default async function ReferralsPage() {
  const viewer = await requireViewer("/referrals");
  const { affiliations, companies, jobs } = await getReferralsData(viewer.id);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="text-muted-foreground">{s.intro}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>{s.workTitle}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AffiliationManager affiliations={affiliations} companies={companies} />
        </CardContent>
      </Card>

      {/* Referral links are for jobs posted on NextStep, so only companies on NextStep get a jobs card. */}
      {affiliations.filter((affiliation) => affiliation.companyId).map((affiliation) => {
        const companyJobs = jobs.filter((job) => job.companyId === affiliation.companyId);
        return (
          <Card key={affiliation.id}>
            <CardHeader>
              <CardTitle>
                <h2>{s.jobsTitle(affiliation.companyName)}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {companyJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{s.jobsEmpty}</p>
              ) : (
                <ul className="space-y-3">
                  {companyJobs.map((job) => (
                    <ReferralJobItem key={job.id} job={job} siteUrl={publicEnv.siteUrl} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
