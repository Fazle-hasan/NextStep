import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { CancelSessionButton } from "@/features/mentorship/booking/components/CancelSessionButton";
import { FeedbackForm } from "@/features/mentorship/booking/components/FeedbackForm";
import { FeedbackView } from "@/features/mentorship/booking/components/FeedbackView";
import { LocalSessionTime } from "@/features/mentorship/booking/components/LocalSessionTime";
import { SessionStatusBadge } from "@/features/mentorship/booking/components/SessionStatusBadge";
import { getSession } from "@/features/mentorship/booking/queries";
import { bookingStrings as s } from "@/features/mentorship/booking/strings";
import { SESSION_TYPE_LABELS, isExpiredRequest } from "@/features/mentorship/labels";

export const metadata: Metadata = { title: s.detail.pageTitle };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

export default async function SessionPage({ params }: PageProps<"/sessions/[id]">) {
  const { id } = await params;
  const viewer = await requireViewer(`/sessions/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();

  const session = await getSession(id);
  if (!session) notFound();
  // The mentor has their own view of the session (respond, notes, next steps).
  if (session.mentorId === viewer.id) redirect(`/mentor/sessions/${id}`);
  if (session.menteeId !== viewer.id) notFound();

  const d = s.detail;
  const started = session.hasStarted;
  const ended = session.hasEnded;
  const expired = isExpiredRequest({ status: session.status, starts_at: session.startsAt });
  const canCancel = (session.status === "requested" || session.status === "confirmed") && !started;
  const canGiveFeedback =
    (session.status === "confirmed" || session.status === "completed") && ended && !session.myFeedback;
  const mentorName = session.mentorName ?? s.mentor.unnamed;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/sessions" className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← {s.backToSessions}
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{SESSION_TYPE_LABELS[session.sessionType]}</h1>
        <SessionStatusBadge status={session.status} startsAt={session.startsAt} />
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{s.sessions.with(mentorName)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="space-y-4">
            <Row label={d.when}>
              <span className="block min-h-6">
                <LocalSessionTime startsAt={session.startsAt} endsAt={session.endsAt} showZone />
              </span>
            </Row>
            <Row label={d.mentor}>
              <Link href={`/mentors/${session.mentorId}`} className="underline underline-offset-4">
                {mentorName}
              </Link>
            </Row>
            <Row label={d.goal}>
              <span className="whitespace-pre-wrap">{session.goalNote ?? d.noGoal}</span>
            </Row>
            {session.status === "declined" && session.declineReason && (
              <Row label={d.declineReason}>
                <span className="whitespace-pre-wrap">{session.declineReason}</span>
              </Row>
            )}
            {session.status === "cancelled" && session.cancelReason && (
              <Row label={d.cancelReason}>
                <span className="whitespace-pre-wrap">{session.cancelReason}</span>
              </Row>
            )}
          </dl>

          {session.status === "requested" && <p className="text-sm text-muted-foreground">{expired ? d.expired : d.waiting}</p>}
          {session.status === "cancelled" && (
            <p className="text-sm text-muted-foreground">
              {session.cancelledBy === viewer.id ? d.cancelledByYou : d.cancelledByMentor}
            </p>
          )}

          {session.status === "confirmed" && session.meetingUrl && !ended && (
            <div className="space-y-1">
              <Button asChild className="h-11 w-full sm:w-auto sm:px-8">
                <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer">
                  {d.join}
                </a>
              </Button>
              <p className="text-sm text-muted-foreground">{d.joinHint}</p>
            </div>
          )}

          {canCancel && <CancelSessionButton sessionId={session.id} />}
        </CardContent>
      </Card>

      {(canGiveFeedback || session.myFeedback || session.mentorFeedback) && (
        <section aria-labelledby="feedback-heading" className="space-y-3">
          <h2 id="feedback-heading" className="text-xl font-semibold">
            {s.feedback.heading}
          </h2>
          {canGiveFeedback && <FeedbackForm sessionId={session.id} />}
          {session.myFeedback && <FeedbackView title={s.feedback.yours} feedback={session.myFeedback} />}
          {session.mentorFeedback && <FeedbackView title={s.feedback.mentors} feedback={session.mentorFeedback} />}
        </section>
      )}
    </div>
  );
}
