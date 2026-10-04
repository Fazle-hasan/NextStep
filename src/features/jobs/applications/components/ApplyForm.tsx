"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

import { applyToJob } from "../actions";
import type { ApplyContext } from "../queries";
import { applySchema, type ApplyInput, type ApplyValues } from "../schemas";
import { applyStrings as s } from "../strings";

type Props = {
  jobId: string;
  questions: ApplyContext["questions"];
  cvs: ApplyContext["cvs"];
  referralId?: string;
};

export function ApplyForm({ jobId, questions, cvs, referralId }: Props) {
  const router = useRouter();
  const [useReferral, setUseReferral] = useState(Boolean(referralId));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<ApplyInput, unknown, ApplyValues>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      jobId,
      cvId: (cvs.find((cv) => cv.is_default) ?? cvs[0])?.id ?? "",
      coverNote: "",
      answers: Object.fromEntries(questions.map((q) => [q.id, ""])),
    },
  });
  const { errors } = form.formState;

  function onSubmit(values: ApplyValues) {
    setSubmitError(null);
    // Same rule the database enforces, checked here for a message next to the question.
    const missing = questions.filter((q) => q.is_required && !values.answers[q.id]);
    if (missing.length > 0) {
      missing.forEach((q) => form.setError(`answers.${q.id}`, { message: s.errors.answerRequired }));
      form.setFocus(`answers.${missing[0]!.id}`);
      return;
    }
    startTransition(async () => {
      const result = await applyToJob({ ...values, referralId: useReferral ? referralId : undefined });
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      router.replace(`/applications/${result.data.applicationId}`);
      router.refresh();
    });
  }

  const referralRejected = useReferral && submitError === s.errors.invalid_referral;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {useReferral && (
        <Alert>
          <AlertDescription>{s.referredNote}</AlertDescription>
        </Alert>
      )}

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">{s.cvLegend}</legend>
        <Controller
          control={form.control}
          name="cvId"
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={field.onChange} aria-invalid={Boolean(errors.cvId)}>
              {cvs.map((cv) => (
                <div key={cv.id} className="flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2">
                  <RadioGroupItem id={`cv-${cv.id}`} value={cv.id} />
                  <Label htmlFor={`cv-${cv.id}`} className="min-w-0 flex-1 font-normal break-all">
                    {cv.file_name}
                  </Label>
                  {cv.is_default && <Badge variant="secondary">{s.defaultCv}</Badge>}
                </div>
              ))}
            </RadioGroup>
          )}
        />
        {errors.cvId && (
          <p role="alert" className="text-sm text-destructive">
            {s.errors.cv}
          </p>
        )}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="coverNote">{s.coverNote}</Label>
        <Textarea
          id="coverNote"
          rows={5}
          maxLength={2000}
          className="text-base"
          aria-describedby="coverNote-hint"
          aria-invalid={Boolean(errors.coverNote)}
          {...form.register("coverNote")}
        />
        <p id="coverNote-hint" className="text-sm text-muted-foreground">
          {s.coverNoteHint}
        </p>
        {errors.coverNote && (
          <p role="alert" className="text-sm text-destructive">
            {errors.coverNote.message}
          </p>
        )}
      </div>

      {questions.length > 0 && (
        <fieldset className="space-y-4">
          <legend className="text-base font-semibold">{s.questionsTitle}</legend>
          {questions.map((q) => {
            const error = errors.answers?.[q.id]?.message;
            return (
              <div key={q.id} className="space-y-2">
                <Label htmlFor={`answer-${q.id}`}>
                  {q.question}{" "}
                  <span className="font-normal text-muted-foreground">({q.is_required ? s.required : s.optional})</span>
                </Label>
                <Textarea
                  id={`answer-${q.id}`}
                  rows={2}
                  maxLength={1000}
                  className="text-base"
                  aria-required={q.is_required}
                  aria-invalid={Boolean(error)}
                  {...form.register(`answers.${q.id}`)}
                />
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
            );
          })}
        </fieldset>
      )}

      {submitError && (
        <div role="alert" className="space-y-2">
          <p className="text-sm text-destructive">{submitError}</p>
          {referralRejected && (
            <Button type="button" variant="outline" className="h-11" onClick={() => setUseReferral(false)}>
              {s.retryWithoutReferral}
            </Button>
          )}
        </div>
      )}

      <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
        {pending ? s.submitting : s.submit}
      </Button>
    </form>
  );
}
