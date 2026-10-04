import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NavItemLink } from "@/components/shared/NavItemLink";
import { SectionIcon } from "@/components/shared/SectionIcon";
import { shellStrings } from "@/components/shared/strings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewer } from "@/features/auth/queries";
import { RecommendedJobs } from "@/features/jobs/search/components/RecommendedJobs";
import { getMyVerificationRequests } from "@/features/profiles/queries";
import { ROLE_LABELS, sectionsForRoles } from "@/lib/sections";

export const metadata: Metadata = { title: "Home" };

const s = shellStrings.home_;

export default async function HomePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const verifications = await getMyVerificationRequests(viewer.id);
  const sections = sectionsForRoles(viewer.roles);
  const firstName = viewer.profile.full_name?.split(" ")[0] ?? "";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">{s.greeting(firstName)}</h1>
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">{s.yourRoles}</h2>
          {viewer.roles.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {viewer.roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {ROLE_LABELS[role]}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{s.noRoles}</p>
          )}
          <Button asChild variant="link" className="h-auto px-0">
            <Link href="/onboarding">{shellStrings.addRole}</Link>
          </Button>
        </div>
      </section>

      {verifications.length > 0 && (
        <section aria-labelledby="verification-heading" className="space-y-3">
          <h2 id="verification-heading" className="text-lg font-semibold">
            {s.verificationHeading}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {verifications.map((v) => (
              <Card key={v.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{s.verificationKinds[v.kind] ?? v.kind}</CardTitle>
                    <Badge variant={v.status === "rejected" ? "destructive" : v.status === "approved" ? "default" : "outline"}>
                      {s.statusBadge[v.status] ?? v.status}
                    </Badge>
                  </div>
                  <CardDescription>{s.verificationStatus[v.status] ?? ""}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      )}

      {viewer.roles.includes("job_seeker") && <RecommendedJobs />}

      <section className="grid gap-4 md:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <SectionIcon id={section.id} className="size-4 text-primary" />
                <Link href={`/${section.id}`} className="hover:underline">
                  {section.name}
                </Link>
              </CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="-mx-3 space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NavItemLink item={item} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
