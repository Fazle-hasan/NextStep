import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { BackToEmployer } from "@/features/employer/components/BackToEmployer";
import { CompanyForm } from "@/features/employer/components/CompanyForm";
import { LocationsEditor } from "@/features/employer/components/LocationsEditor";
import { LogoUpload } from "@/features/employer/components/LogoUpload";
import { companyDefaults } from "@/features/employer/defaults";
import { getCompanyLocations, getMyCompany } from "@/features/employer/queries";
import { employerStrings } from "@/features/employer/strings";
import { VERIFICATION_STATUS_LABELS } from "@/features/jobs/labels";
import { getActiveCities } from "@/features/profiles/queries";

export const metadata: Metadata = { title: employerStrings.company.editTitle };

export default async function EditCompanyPage({ params }: PageProps<"/employer/company/[companyId]/edit">) {
  const { companyId } = await params;
  const viewer = await requireViewer(`/employer/company/${companyId}/edit`);
  if (!z.uuid().safeParse(companyId).success) notFound();

  const company = await getMyCompany(viewer.id, companyId);
  if (!company) notFound();
  const [locations, cities] = await Promise.all([getCompanyLocations(company.id), getActiveCities()]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BackToEmployer />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <h1>{employerStrings.company.editTitle}</h1>
          </CardTitle>
          <CardDescription>
            {company.name} · {VERIFICATION_STATUS_LABELS[company.verification_status]}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyForm companyId={company.id} defaults={companyDefaults(company)} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            <h2>{employerStrings.logo.title}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LogoUpload companyId={company.id} companyName={company.name} logoPath={company.logo_path} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            <h2>{employerStrings.locations.title}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LocationsEditor companyId={company.id} locations={locations} cities={cities} />
        </CardContent>
      </Card>
    </div>
  );
}
