import { bookingStrings as s } from "../strings";
import type { FeedbackEntry } from "../types";

type Props = { title: string; feedback: FeedbackEntry };

// One side's feedback on a session. Plain text with line breaks kept.
export function FeedbackView({ title, feedback }: Props) {
  return (
    <div className="space-y-2 rounded-xl border p-4">
      <h3 className="font-medium">{title}</h3>
      {feedback.rating != null && <p className="text-sm font-medium">{s.feedback.ratingGiven(feedback.rating)}</p>}
      {feedback.comment && <p className="text-sm break-words whitespace-pre-wrap">{feedback.comment}</p>}
      {feedback.nextSteps && (
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-muted-foreground">{s.feedback.nextSteps}</h4>
          <p className="text-sm break-words whitespace-pre-wrap">{feedback.nextSteps}</p>
        </div>
      )}
    </div>
  );
}
