import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { BackToEmployer } from "@/features/employer/components/BackToEmployer";
import { JobForm } from "@/features/employer/components/JobForm";
import { NEW_JOB_DEFAULTS } from "@/features/employer/defaults";
import { getMyCompaniesBasic, getMyCompany } from "@/features/employer/queries";
import { employerStrings } from "@/features/employer/strings";
import { getNeighbourhoods, getSkills } from "@/features/jobs/queries";
import { getActiveCities } from "@/features/profiles/queries";

const s = employerStrings.job;

export const metadata: Metadata = { title: s.newTitle };

export default async function NewJobPage({ searchParams }: PageProps<"/employer/jobs/new">) {
  const params = await searchParams;
  const requested = typeof params.company === "string" ? params.company : undefined;
  const viewer = await requireViewer(requested ? `/employer/jobs/new?company=${requested}` : "/employer/jobs/new");

  // No company in the link: use the only company, or go back to pick one.
  if (!requested) {
    const companies = await getMyCompaniesBasic(viewer.id);
    const only = companies.length === 1 ? companies[0] : undefined;
    if (only) redirect(`/employer/jobs/new?company=${only.id}`);
    redirect(companies.length === 0 ? "/employer/company/new" : "/employer");
  }
  if (!z.uuid().safeParse(requested).success) notFound();
  const company = await getMyCompany(viewer.id, requested);
  if (!company) notFound();

  const [cities, neighbourhoods, skills] = await Promise.all([getActiveCities(), getNeighbourhoods(), getSkills()]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BackToEmployer />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <h1>{s.newTitle}</h1>
          </CardTitle>
          <CardDescription>{s.forCompany(company.name)}</CardDescription>
        </CardHeader>
        <CardContent>
          <JobForm
            companyId={company.id}
            companyVerified={company.verification_status === "approved" && !company.hidden_at}
            defaults={NEW_JOB_DEFAULTS}
            cities={cities}
            neighbourhoods={neighbourhoods}
            skills={skills}
          />
        </CardContent>
      </Card>
    </div>
  );
}
