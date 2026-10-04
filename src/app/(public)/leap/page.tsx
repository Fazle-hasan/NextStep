import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageFrame } from "@/features/jobs/search/components/PageFrame";
import { getPublicPageViewer } from "@/features/jobs/search/viewer";
import { leapStrings as s } from "@/features/leap/strings";

export const metadata: Metadata = { title: s.title };

// LEAP is future scope (D-031): this page tells visitors the integration with the LEAP program is coming.
export default async function LeapPage() {
  const { inShell } = await getPublicPageViewer();

  return (
    <PageFrame inShell={inShell} className="max-w-2xl space-y-6">
      <div className="space-y-3">
        <Badge variant="secondary">{s.badge}</Badge>
        <h1 className="text-2xl font-semibold tracking-tight">{s.heading}</h1>
        <p className="text-muted-foreground">{s.intro}</p>
      </div>

      <section aria-labelledby="leap-stages" className="space-y-3">
        <h2 id="leap-stages" className="text-lg font-semibold">
          {s.stagesHeading}
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {s.stages.map((stage) => (
            <li key={stage.name}>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-base">
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                    >
                      {stage.letter}
                    </span>
                    {stage.name}
                  </CardTitle>
                  <CardDescription>{stage.body}</CardDescription>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{s.meanwhileHeading}</CardTitle>
          <CardDescription>{s.meanwhile}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/mentors">{s.findMentor}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/jobs?leap=1">{s.browseJobs}</Link>
          </Button>
        </CardContent>
      </Card>
    </PageFrame>
  );
}
