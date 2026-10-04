import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireViewer } from "@/features/auth/queries";
import { ExceptionsEditor } from "@/features/mentorship/mentor/components/ExceptionsEditor";
import { RulesEditor } from "@/features/mentorship/mentor/components/RulesEditor";
import { getAvailability, getMentorProfile } from "@/features/mentorship/mentor/queries";
import { mentorStrings as s } from "@/features/mentorship/mentor/strings";

export const metadata: Metadata = { title: "Mentor availability" };

export default async function MentorAvailabilityPage() {
  const viewer = await requireViewer("/mentor/availability");
  const profile = await getMentorProfile(viewer.id);

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{s.availability.title}</h1>
        <p className="text-muted-foreground">{s.availability.needProfile}</p>
        <Button asChild className="h-11">
          <Link href="/mentor/profile">{s.create.cta}</Link>
        </Button>
      </div>
    );
  }

  const { rules, exceptions } = await getAvailability(viewer.id);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-1">
        <Link href="/mentor" className="inline-flex min-h-11 items-center text-sm text-primary hover:underline">
          {s.back}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{s.availability.title}</h1>
        <p className="text-muted-foreground">
          {s.availability.explain(profile.timezone.replaceAll("_", " "), profile.defaultDurationMin)}
        </p>
      </div>

      <section className="space-y-3" aria-labelledby="weekly-hours">
        <h2 id="weekly-hours" className="text-lg font-semibold">
          {s.availability.weeklyTitle}
        </h2>
        <RulesEditor rules={rules} />
      </section>

      <section className="space-y-3" aria-labelledby="one-off-changes">
        <div className="space-y-1">
          <h2 id="one-off-changes" className="text-lg font-semibold">
            {s.availability.exceptionsTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{s.availability.exceptionsBody}</p>
        </div>
        <ExceptionsEditor exceptions={exceptions} />
      </section>
    </div>
  );
}
