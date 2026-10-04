import type { Metadata } from "next";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireViewer } from "@/features/auth/queries";
import { MentorVerificationBanner } from "@/features/mentorship/mentor/components/MentorVerificationBanner";
import { SessionListItem } from "@/features/mentorship/mentor/components/SessionListItem";
import { getMentorProfile, getMentorSessions, hasAvailabilityRules } from "@/features/mentorship/mentor/queries";
import { mentorStrings as s } from "@/features/mentorship/mentor/strings";
import type { MentorSession } from "@/features/mentorship/mentor/types";

export const metadata: Metadata = { title: "Mentor dashboard" };

type SectionProps = {
  id: string;
  title: string;
  empty: string;
  sessions: MentorSession[];
  variant: "request" | "upcoming" | "past";
};

function SessionSection({ id, title, empty, sessions, variant }: SectionProps) {
  return (
    <section className="space-y-3" aria-labelledby={id}>
      <h2 id={id} className="text-lg font-semibold">
        {title}
        {sessions.length > 0 && <span className="ml-2 text-sm font-normal text-muted-foreground">{sessions.length}</span>}
      </h2>
      {sessions.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li key={session.id}>
              <SessionListItem session={session} variant={variant} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function MentorDashboardPage() {
  const viewer = await requireViewer("/mentor");
  const profile = await getMentorProfile(viewer.id);

  // No role check: creating the profile is what grants the mentor role.
  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{s.create.title}</h1>
          <p className="text-muted-foreground">{s.create.body}</p>
        </div>
        <Button asChild className="h-11 text-base">
          <Link href="/mentor/profile">{s.create.cta}</Link>
        </Button>
      </div>
    );
  }

  const [sessions, hasRules] = await Promise.all([getMentorSessions(viewer.id), hasAvailabilityRules(viewer.id)]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="text-muted-foreground">{s.intro}</p>
      </div>

      <div className="space-y-2">
        <p className="text-base font-medium">{profile.headline}</p>
        <p className="text-sm text-muted-foreground">
          {profile.ratingAvg !== null && profile.ratingCount > 0
            ? s.rating(profile.ratingAvg.toFixed(1), profile.ratingCount)
            : s.noRating}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="h-11">
            <Link href="/mentor/profile">{s.links.profile}</Link>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <Link href="/mentor/availability">{s.links.availability}</Link>
          </Button>
        </div>
      </div>

      <MentorVerificationBanner
        status={profile.verificationStatus}
        rejectionReason={profile.rejectionReason}
        isAccepting={profile.isAccepting}
      />

      {!hasRules && (
        <Alert>
          <AlertTitle>{s.noAvailability.title}</AlertTitle>
          <AlertDescription>
            <p>{s.noAvailability.body}</p>
            <Link href="/mentor/availability" className="mt-1 inline-flex min-h-11 items-center font-medium text-primary hover:underline">
              {s.noAvailability.cta}
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <SessionSection
        id="mentor-requests"
        title={s.sessions.requests}
        empty={s.sessions.requestsEmpty}
        sessions={sessions.requests}
        variant="request"
      />
      <SessionSection
        id="mentor-upcoming"
        title={s.sessions.upcoming}
        empty={s.sessions.upcomingEmpty}
        sessions={sessions.upcoming}
        variant="upcoming"
      />
      <SessionSection id="mentor-past" title={s.sessions.past} empty={s.sessions.pastEmpty} sessions={sessions.past} variant="past" />
    </div>
  );
}
