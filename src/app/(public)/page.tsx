import Link from "next/link";
import { redirect } from "next/navigation";

import { SectionIcon } from "@/components/shared/SectionIcon";
import { shellStrings } from "@/components/shared/strings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewer } from "@/features/auth/queries";
import { SECTIONS } from "@/lib/sections";

export default async function LandingPage() {
  const viewer = await getViewer();
  // Members go straight to their dashboard; the landing page is for visitors.
  if (viewer?.profile.onboarding_completed_at) redirect("/home");
  const signedIn = viewer !== null;

  return (
    <main className="flex-1">
      <section className="bg-gradient-to-b from-primary/10 to-background px-4 py-14 md:py-20">
        <div className="mx-auto max-w-3xl space-y-5 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-balance md:text-5xl">{shellStrings.tagline}</h1>
          <p className="text-base text-pretty text-muted-foreground md:text-lg">{shellStrings.landing.intro}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-11 px-6 text-base">
              <Link href={signedIn ? "/home" : "/sign-in"}>
                {signedIn ? shellStrings.goToDashboard : shellStrings.getStarted}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 px-6 text-base">
              <Link href="/jobs">{shellStrings.landing.browseJobs}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section aria-labelledby="sections-heading" className="mx-auto max-w-5xl px-4 py-12">
        <h2 id="sections-heading" className="mb-6 text-xl font-semibold md:text-2xl">
          {shellStrings.landing.sectionsHeading}
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {SECTIONS.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <SectionIcon id={section.id} className="size-5" />
                  </span>
                  {section.items.some((item) => item.available) ? (
                    <Badge>{shellStrings.landing.live}</Badge>
                  ) : (
                    <Badge variant="outline">{shellStrings.comingSoon}</Badge>
                  )}
                </div>
                <p className="pt-2 text-sm font-medium text-primary">{section.tagline}</p>
                <CardTitle className="text-lg">{section.name}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {section.items
                    .filter((item) => !item.roles)
                    .map((item) => (
                      <li key={item.href}>{item.label}</li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
