"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { submitMentorFeedback } from "../actions";
import { mentorFeedbackSchema } from "../schemas";
import { mentorStrings } from "../strings";

const s = mentorStrings.feedback;

// The mentor's feedback after a session: a comment and recommended next steps (mentors do not rate).
export function MentorFeedbackForm({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [nextSteps, setNextSteps] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const values = { sessionId, comment, nextSteps };
    const parsed = mentorFeedbackSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? mentorStrings.errors.invalid);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitMentorFeedback(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.sent);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <h3 className="text-base font-semibold">{s.formTitle}</h3>
      <div className="space-y-2">
        <Label htmlFor="feedback-comment">{s.comment}</Label>
        <Textarea
          id="feedback-comment"
          rows={3}
          maxLength={1000}
          className="text-base"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="feedback-next-steps">{s.nextSteps}</Label>
        <Textarea
          id="feedback-next-steps"
          rows={4}
          maxLength={2000}
          className="text-base"
          aria-describedby="feedback-next-steps-hint"
          value={nextSteps}
          onChange={(event) => setNextSteps(event.target.value)}
        />
        <p id="feedback-next-steps-hint" className="text-sm text-muted-foreground">
          {s.nextStepsHint}
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="h-11" disabled={pending}>
        {pending ? s.sending : s.submit}
      </Button>
    </form>
  );
}
