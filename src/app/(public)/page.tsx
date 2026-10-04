import { ArrowRight, MapPin } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { HeroIllustration } from "@/components/shared/landing/HeroIllustration";
import { LandingFooter } from "@/components/shared/landing/LandingFooter";
import { LatestJobs } from "@/components/shared/landing/LatestJobs";
import { SectionEntryCard } from "@/components/shared/landing/SectionEntryCard";
import { TrustSection } from "@/components/shared/landing/TrustSection";
import { shellStrings } from "@/components/shared/strings";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/features/auth/queries";
import { SECTIONS } from "@/lib/sections";

const s = shellStrings.landing;

export default async function LandingPage() {
  const viewer = await getViewer();
  // Members go straight to their dashboard; the landing page is for visitors.
  if (viewer?.profile.onboarding_completed_at) redirect("/home");
  const signedIn = viewer !== null;

  return (
    <>
      <main className="flex-1">
        <section className="bg-brand-soft px-4 pt-10 pb-12 md:pt-16 md:pb-20">
          <div className="mx-auto grid max-w-5xl items-center gap-8 md:grid-cols-[1.15fr_1fr]">
            <div className="space-y-5">
              <p className="inline-flex rounded-full bg-card px-3 py-1 text-sm font-medium text-primary shadow-xs">
                {s.eyebrow}
              </p>
              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">{s.heroTitle}</h1>
              <p className="max-w-xl text-base text-pretty text-muted-foreground md:text-lg">{s.intro}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 px-6 text-base">
                  <Link href={signedIn ? "/home" : "/sign-up"}>
                    {signedIn ? shellStrings.goToDashboard : shellStrings.getStarted}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 bg-card px-6 text-base">
                  <Link href="/jobs">{s.browseJobs}</Link>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{s.heroNote}</p>
            </div>
            <HeroIllustration className="mx-auto max-w-[15rem] sm:max-w-sm md:max-w-none" />
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-14 px-4 py-12 md:py-16">
          <section aria-labelledby="how-heading" className="space-y-5">
            <h2 id="how-heading" className="text-xl font-semibold md:text-2xl">
              {s.howHeading}
            </h2>
            <ol className="grid gap-4 md:grid-cols-3">
              {s.howSteps.map((step, index) => (
                <li key={step.title} className="flex gap-4 rounded-2xl border bg-card p-5">
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="sections-heading" className="space-y-5">
            <h2 id="sections-heading" className="text-xl font-semibold md:text-2xl">
              {s.sectionsHeading}
            </h2>
            <ul className="grid gap-4 md:grid-cols-3">
              {SECTIONS.map((section) => {
                const card = s.sectionCards[section.id];
                return (
                  <li key={section.id}>
                    <SectionEntryCard section={section} benefit={card.benefit} action={card.action} href={card.href} />
                  </li>
                );
              })}
            </ul>
          </section>

          <Suspense fallback={null}>
            <LatestJobs />
          </Suspense>

          <section
            aria-labelledby="places-heading"
            className="flex flex-col gap-4 rounded-2xl border bg-card p-5 md:flex-row md:items-center md:justify-between md:p-6"
          >
            <div className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-grow-soft text-grow">
                <MapPin className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 id="places-heading" className="text-lg font-semibold">
                  {s.placesTitle}
                </h2>
                <p className="text-sm text-muted-foreground">{s.placesBody}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
              <Button asChild variant="outline" className="h-11">
                <Link href="/places">
                  {s.placesAction}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="h-11">
                <Link href="/areas">{s.guidesAction}</Link>
              </Button>
            </div>
          </section>

          <TrustSection />
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
