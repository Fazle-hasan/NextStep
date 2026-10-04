import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireViewer } from "@/features/auth/queries";
import { EmptyState } from "@/features/jobs/search/components/EmptyState";
import { SessionListItem } from "@/features/mentorship/booking/components/SessionListItem";
import { getMySessions } from "@/features/mentorship/booking/queries";
import { bookingStrings } from "@/features/mentorship/booking/strings";
import type { SessionSummary } from "@/features/mentorship/booking/types";

const s = bookingStrings.sessions;

export const metadata: Metadata = { title: s.pageTitle };

type SectionProps = { id: string; title: string; empty: string; sessions: SessionSummary[] };

function SessionSection({ id, title, empty, sessions }: SectionProps) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      {sessions.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li key={session.id}>
              <SessionListItem session={session} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function SessionsPage() {
  const viewer = await requireViewer("/sessions");
  const { upcoming, past } = await getMySessions(viewer.id);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{s.pageTitle}</h1>
          <p className="text-muted-foreground">{s.intro}</p>
        </div>
        <Button asChild variant="outline" className="h-11">
          <Link href="/mentors">{s.findMentor}</Link>
        </Button>
      </header>

      {upcoming.length + past.length === 0 ? (
        <EmptyState title={s.emptyTitle} body={s.emptyBody}>
          <Button asChild className="h-11">
            <Link href="/mentors">{s.findMentor}</Link>
          </Button>
        </EmptyState>
      ) : (
        <>
          <SessionSection id="upcoming-heading" title={s.upcoming} empty={s.upcomingEmpty} sessions={upcoming} />
          <SessionSection id="past-heading" title={s.past} empty={s.pastEmpty} sessions={past} />
        </>
      )}
    </div>
  );
}
