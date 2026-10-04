import { APPLICATION_STATUS_LABELS } from "@/features/jobs/labels";
import { formatDateTime } from "@/lib/utils/dates";

import type { ApplicantDetail } from "../queries";
import { pipelineStrings as s } from "../strings";

type Props = { detail: ApplicantDetail };

// What the applicant sent with this application: cover note, screening answers, referral, and the stage history.
export function ApplicationSubmission({ detail }: Props) {
  const { application, answers, referral, history } = detail;

  return (
    <div className="space-y-5">
      {referral && (
        <div className="space-y-1.5 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <h3 className="text-sm font-semibold">{s.referralTitle}</h3>
          <p className="text-sm">{s.referredBy(referral.referrerName ?? s.unknownAuthor)}</p>
          <p className="text-sm text-muted-foreground">
            {referral.affiliationConfirmed === null
              ? s.affiliationMissing
              : referral.affiliationConfirmed
                ? s.affiliationConfirmed
                : s.affiliationUnconfirmed}
          </p>
          {referral.note && <p className="text-sm break-words whitespace-pre-line">“{referral.note}”</p>}
        </div>
      )}

      {application.cover_note && (
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold">{s.coverNote}</h3>
          <p className="text-sm break-words whitespace-pre-line">{application.cover_note}</p>
        </div>
      )}

      {answers.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold">{s.answers}</h3>
          <dl className="space-y-3">
            {answers.map((item) => (
              <div key={item.question} className="text-sm">
                <dt className="font-medium break-words">{item.question}</dt>
                <dd className={item.answer ? "break-words whitespace-pre-line" : "text-muted-foreground"}>
                  {item.answer ?? s.noAnswer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold">{s.history}</h3>
        <ol className="space-y-2 border-l pl-4">
          {history.map((entry) => (
            <li key={entry.id} className="text-sm">
              <p className="font-medium">
                {entry.from_status ? APPLICATION_STATUS_LABELS[entry.to_status] : s.historyStart}
              </p>
              <p className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
