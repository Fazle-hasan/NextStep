"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { submitFeedback } from "../actions";
import { RATINGS, feedbackSchema, type FeedbackInput, type FeedbackValues } from "../schemas";
import { bookingStrings as s } from "../strings";

// The mentee's rating (required) and comment, once the session has ended.
export function FeedbackForm({ sessionId }: { sessionId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<FeedbackInput, unknown, FeedbackValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { sessionId, comment: "" },
  });
  const f = s.feedback;

  function onValid() {
    setError(null);
    startTransition(async () => {
      const result = await submitFeedback(getValues());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(f.sent);
    });
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4 rounded-xl border p-4" noValidate>
      <h3 className="font-medium">{f.formHeading}</h3>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{f.rating}</legend>
        <div className="flex flex-wrap gap-2">
          {RATINGS.map((value) => (
            <label
              key={value}
              className="flex size-11 cursor-pointer items-center justify-center rounded-lg border text-base font-medium has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input type="radio" value={value} className="sr-only" {...register("rating")} />
              <span aria-hidden="true">{value}</span>
              <span className="sr-only">{f.ratingOption(Number(value))}</span>
            </label>
          ))}
        </div>
        {errors.rating && (
          <p role="alert" className="text-sm text-destructive">
            {s.errors.rating}
          </p>
        )}
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="feedback-comment">{f.comment}</Label>
        <Textarea
          id="feedback-comment"
          rows={3}
          maxLength={1000}
          className="text-base"
          aria-invalid={Boolean(errors.comment)}
          aria-describedby="feedback-comment-hint"
          {...register("comment")}
        />
        <p id="feedback-comment-hint" className="text-sm text-muted-foreground">
          {f.commentHint}
        </p>
        {errors.comment && (
          <p role="alert" className="text-sm text-destructive">
            {errors.comment.message}
          </p>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="h-11 w-full sm:w-auto sm:px-8" disabled={pending}>
        {pending ? f.submitting : f.submit}
      </Button>
    </form>
  );
}
