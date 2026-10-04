import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { CompanyCard } from "@/features/employer/components/CompanyCard";
import { getEmployerDashboard } from "@/features/employer/queries";
import { employerStrings } from "@/features/employer/strings";

const s = employerStrings.dashboard;
const MAX_COMPANIES = 3;

export const metadata: Metadata = { title: s.title };

export default async function EmployerDashboardPage() {
  const viewer = await requireViewer("/employer");
  const companies = await getEmployerDashboard(viewer.id);
  const ownedCount = companies.filter((c) => c.company.owner_id === viewer.id).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="text-muted-foreground">{s.subtitle}</p>
      </header>

      {companies.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              <h2>{s.emptyTitle}</h2>
            </CardTitle>
            <CardDescription>{s.emptyBody}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="h-11">
              <Link href="/employer/company/new">{s.registerCompany}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {companies.map((entry) => (
            <CompanyCard key={entry.company.id} {...entry} />
          ))}
          {ownedCount < MAX_COMPANIES && (
            <Button asChild variant="outline" className="h-11">
              <Link href="/employer/company/new">{s.registerAnother}</Link>
            </Button>
          )}
        </>
      )}
    </div>
  );
}
