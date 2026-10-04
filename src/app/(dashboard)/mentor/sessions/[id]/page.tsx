import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { requireViewer } from "@/features/auth/queries";
import { SessionStatusBadge } from "@/features/mentorship/booking/components/SessionStatusBadge";
import { SESSION_TYPE_LABELS } from "@/features/mentorship/labels";
import { CancelSessionButton } from "@/features/mentorship/mentor/components/CancelSessionButton";
import { MentorFeedbackForm } from "@/features/mentorship/mentor/components/MentorFeedbackForm";
import { PrivateNotes } from "@/features/mentorship/mentor/components/PrivateNotes";
import { RespondButtons } from "@/features/mentorship/mentor/components/RespondButtons";
import { SessionTime } from "@/features/mentorship/mentor/components/SessionTime";
import { getMentorSession } from "@/features/mentorship/mentor/queries";
import { mentorStrings as s } from "@/features/mentorship/mentor/strings";
import type { SessionFeedback } from "@/features/mentorship/mentor/types";
import { BlockButton } from "@/features/safety/components/BlockButton";
import { ReportDialog } from "@/features/safety/components/ReportDialog";

export const metadata: Metadata = { title: "Session" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm font-medium">{label}</dt>
      <dd className="text-sm break-words text-muted-foreground">{children}</dd>
    </div>
  );
}

function FeedbackBlock({ title, feedback }: { title: string; feedback: SessionFeedback }) {
  return (
    <div className="space-y-1 text-sm">
      <p className="font-medium">{title}</p>
      {feedback.rating !== null && <p>{s.feedback.theirRating(feedback.rating)}</p>}
      {feedback.comment && <p className="break-words whitespace-pre-line text-muted-foreground">{feedback.comment}</p>}
      {feedback.nextSteps && (
        <>
          <p className="pt-1 font-medium">{s.feedback.nextStepsLabel}</p>
          <p className="break-words whitespace-pre-line text-muted-foreground">{feedback.nextSteps}</p>
        </>
      )}
    </div>
  );
}

export default async function MentorSessionPage({ params }: PageProps<"/mentor/sessions/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const viewer = await requireViewer(`/mentor/sessions/${id}`);
  const session = await getMentorSession(id, viewer.id);
  if (!session) notFound();

  const feedbackOpen = session.status === "confirmed" || session.status === "completed";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-1">
        <Link href="/mentor" className="inline-flex min-h-11 items-center text-sm text-primary hover:underline">
          {s.back}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{s.sessions.with(session.menteeName)}</h1>
          <SessionStatusBadge status={session.status} startsAt={session.startsAt} />
        </div>
      </div>

      <dl className="space-y-4 rounded-xl border p-4">
        <Row label={s.detail.type}>{SESSION_TYPE_LABELS[session.sessionType]}</Row>
        <Row label={s.detail.when}>
          <SessionTime startsAt={session.startsAt} endsAt={session.endsAt} />
        </Row>
        <Row label={s.sessions.goal}>
          <span className="whitespace-pre-line">{session.goalNote ?? s.sessions.noGoal}</span>
        </Row>
        {session.meetingUrl && (
          <Row label={s.sessions.meetingLink}>
            <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">
              {session.meetingUrl}
            </a>
          </Row>
        )}
        {session.status === "declined" && session.declineReason && <Row label={s.detail.declineReason}>{session.declineReason}</Row>}
        {session.status === "cancelled" && session.cancelReason && <Row label={s.detail.cancelReason}>{session.cancelReason}</Row>}
      </dl>

      {(session.canRespond || session.canCancel) && (
        <div className="flex flex-wrap gap-2">
          {session.canRespond && <RespondButtons sessionId={session.id} />}
          {session.canCancel && <CancelSessionButton sessionId={session.id} />}
        </div>
      )}

      {feedbackOpen && (
        <section className="space-y-4 rounded-xl border p-4" aria-labelledby="session-feedback">
          <h2 id="session-feedback" className="text-lg font-semibold">
            {s.feedback.title}
          </h2>
          {session.menteeFeedback ? (
            <FeedbackBlock title={s.feedback.theirs} feedback={session.menteeFeedback} />
          ) : (
            <p className="text-sm text-muted-foreground">{s.feedback.noneYet}</p>
          )}
          {session.myFeedback && <FeedbackBlock title={s.feedback.yours} feedback={session.myFeedback} />}
          {session.canGiveFeedback && <MentorFeedbackForm sessionId={session.id} />}
          {!session.hasEnded && <p className="text-sm text-muted-foreground">{s.feedback.opensLater}</p>}
        </section>
      )}

      <PrivateNotes sessionId={session.id} notes={session.notes} />

      <div className="flex flex-wrap gap-2">
        <ReportDialog targetType="user" targetId={session.menteeId} />
        <BlockButton userId={session.menteeId} />
      </div>
    </div>
  );
}
