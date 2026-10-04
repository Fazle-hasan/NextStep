import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { BackToEmployer } from "@/features/employer/components/BackToEmployer";
import { CompanyForm } from "@/features/employer/components/CompanyForm";
import { NEW_COMPANY_DEFAULTS } from "@/features/employer/defaults";
import { employerStrings } from "@/features/employer/strings";

const s = employerStrings.company;

export const metadata: Metadata = { title: s.newTitle };

export default async function NewCompanyPage() {
  await requireViewer("/employer/company/new");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BackToEmployer />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <h1>{s.newTitle}</h1>
          </CardTitle>
          <CardDescription>{s.newSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyForm defaults={NEW_COMPANY_DEFAULTS} />
        </CardContent>
      </Card>
    </div>
  );
}
