import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { NextSteps } from "@/components/shared/home/NextSteps";
import { SectionShortcutCard } from "@/components/shared/home/SectionShortcutCard";
import { VerificationList } from "@/components/shared/home/VerificationList";
import { shellStrings } from "@/components/shared/strings";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer } from "@/features/auth/queries";
import { RecommendedJobs } from "@/features/jobs/search/components/RecommendedJobs";
import { getMyVerificationRequests } from "@/features/profiles/queries";
import { ROLE_LABELS, sectionsForRoles } from "@/lib/sections";

export const metadata: Metadata = { title: "Home" };

const s = shellStrings.home_;

function todayLabel(): string {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
}

export default async function HomePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const verifications = await getMyVerificationRequests(viewer.id);
  const sections = sectionsForRoles(viewer.roles);
  const firstName = viewer.profile.full_name?.split(" ")[0] ?? "";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <section className="space-y-3 rounded-2xl bg-brand-soft p-5 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{s.greeting(firstName)}</h1>
          <p className="text-sm text-muted-foreground">{s.today(todayLabel())}</p>
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">{s.yourRoles}</h2>
          {viewer.roles.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {viewer.roles.map((role) => (
                <li key={role}>
                  <Badge variant="outline" className="bg-card">
                    {ROLE_LABELS[role]}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{s.noRoles}</p>
          )}
          <Link
            href="/onboarding"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {shellStrings.addRole}
          </Link>
        </div>
      </section>

      <Suspense fallback={<Skeleton className="h-32 rounded-2xl" />}>
        <NextSteps viewer={viewer} verifications={verifications} />
      </Suspense>

      <section aria-labelledby="shortcuts-heading" className="space-y-3">
        <h2 id="shortcuts-heading" className="text-lg font-semibold">
          {s.shortcutsHeading}
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {sections.map((section) => (
            <li key={section.id}>
              <SectionShortcutCard section={section} />
            </li>
          ))}
        </ul>
      </section>

      {viewer.roles.includes("job_seeker") && <RecommendedJobs />}

      <VerificationList verifications={verifications} />
    </div>
  );
}
