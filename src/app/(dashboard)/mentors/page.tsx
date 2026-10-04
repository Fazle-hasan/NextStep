import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireViewer } from "@/features/auth/queries";
import { EmptyState } from "@/features/jobs/search/components/EmptyState";
import { MentorCard } from "@/features/mentorship/booking/components/MentorCard";
import { MentorFilters } from "@/features/mentorship/booking/components/MentorFilters";
import { getMentorFilterOptions, getMentors } from "@/features/mentorship/booking/queries";
import { parseMentorFilters } from "@/features/mentorship/booking/schemas";
import { bookingStrings } from "@/features/mentorship/booking/strings";

const s = bookingStrings.list;

export const metadata: Metadata = { title: s.pageTitle };

export default async function MentorsPage({ searchParams }: PageProps<"/mentors">) {
  const viewer = await requireViewer("/mentors");
  const filters = parseMentorFilters(await searchParams);
  const [options, mentors] = await Promise.all([getMentorFilterOptions(), getMentors(viewer.id, filters)]);
  const hasFilters = Boolean(filters.cityId || filters.sessionType || filters.skillId);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{s.pageTitle}</h1>
          <p className="text-muted-foreground">{s.intro}</p>
        </div>
        <Button asChild variant="outline" className="h-11">
          <Link href="/sessions">{s.mySessions}</Link>
        </Button>
      </header>

      <MentorFilters filters={filters} cities={options.cities} skills={options.skills} />

      {mentors.length === 0 ? (
        <EmptyState title={s.emptyTitle} body={s.emptyBody}>
          {hasFilters && (
            <Button asChild variant="outline" className="h-11">
              <Link href="/mentors">{s.clear}</Link>
            </Button>
          )}
        </EmptyState>
      ) : (
        <section aria-labelledby="mentor-results" className="space-y-3">
          <h2 id="mentor-results" className="text-sm text-muted-foreground" aria-live="polite">
            {s.count(mentors.length)}
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">
            {mentors.map((mentor) => (
              <li key={mentor.id}>
                <MentorCard mentor={mentor} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
