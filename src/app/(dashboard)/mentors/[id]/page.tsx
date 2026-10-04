import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { BookingPanel } from "@/features/mentorship/booking/components/BookingPanel";
import { MentorRating } from "@/features/mentorship/booking/components/MentorRating";
import { getMentor, getMentorSlots, getUpcomingSessionCount } from "@/features/mentorship/booking/queries";
import { MAX_UPCOMING_SESSIONS } from "@/features/mentorship/booking/schemas";
import { bookingStrings as s } from "@/features/mentorship/booking/strings";
import { SESSION_TYPE_LABELS } from "@/features/mentorship/labels";
import { BlockButton } from "@/features/safety/components/BlockButton";
import { ReportDialog } from "@/features/safety/components/ReportDialog";

export const metadata: Metadata = { title: s.list.pageTitle };

function TagSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item}>
            <Badge variant="secondary">{item}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{children}</div>;
}

export default async function MentorPage({ params }: PageProps<"/mentors/[id]">) {
  const { id } = await params;
  const viewer = await requireViewer(`/mentors/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();

  const mentor = await getMentor(id);
  if (!mentor) notFound();

  const isSelf = mentor.id === viewer.id;
  const canBook = !isSelf && mentor.isBookable;
  const [upcoming, slots] = canBook
    ? await Promise.all([getUpcomingSessionCount(viewer.id), getMentorSlots(id, 0)])
    : [0, []];
  const name = mentor.name ?? s.mentor.unnamed;
  const facts = [s.mentor.years(mentor.yearsExperience), mentor.cityName, s.mentor.sessionLength(mentor.durationMin)].filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/mentors" className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← {s.back}
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{name}</h1>
          <MentorRating avg={mentor.ratingAvg} count={mentor.ratingCount} />
        </div>
        <p className="text-lg break-words">{mentor.headline}</p>
        <p className="text-sm text-muted-foreground">{facts.join(" · ")}</p>
        <p className="text-sm text-muted-foreground">{s.mentor.timezone(mentor.timezone)}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{s.mentor.about}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="break-words whitespace-pre-wrap">{mentor.bio ?? s.mentor.noBio}</p>
          <TagSection title={s.mentor.offers} items={mentor.sessionTypes.map((type) => SESSION_TYPE_LABELS[type])} />
          <TagSection title={s.mentor.industries} items={mentor.industries} />
          <TagSection title={s.mentor.skills} items={mentor.skills} />
          <TagSection title={s.mentor.languages} items={mentor.languages} />
        </CardContent>
      </Card>

      <section aria-labelledby="booking-heading" className="space-y-4">
        <h2 id="booking-heading" className="text-xl font-semibold">
          {s.booking.heading}
        </h2>
        {isSelf ? (
          <Notice>
            <p>{s.booking.ownProfile}</p>
            <Button asChild variant="outline" className="h-11">
              <Link href="/mentor">{s.booking.manageProfile}</Link>
            </Button>
          </Notice>
        ) : !mentor.isBookable ? (
          <Notice>
            <p>{s.booking.notAccepting}</p>
          </Notice>
        ) : upcoming >= MAX_UPCOMING_SESSIONS ? (
          <Notice>
            <p>{s.booking.limitReached}</p>
            <Button asChild variant="outline" className="h-11">
              <Link href="/sessions">{s.list.mySessions}</Link>
            </Button>
          </Notice>
        ) : (
          <BookingPanel
            mentorId={mentor.id}
            sessionTypes={mentor.sessionTypes}
            mentorTimeZone={mentor.timezone}
            initialSlots={slots}
          />
        )}
      </section>

      {!isSelf && (
        <div className="flex flex-wrap gap-3 border-t pt-4">
          <ReportDialog targetType="user" targetId={mentor.id} />
          <BlockButton userId={mentor.id} />
        </div>
      )}
    </div>
  );
}
