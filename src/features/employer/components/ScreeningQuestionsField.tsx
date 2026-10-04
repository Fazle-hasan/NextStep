"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { MAX_QUESTIONS, type JobFormInput } from "../schemas";
import { employerStrings } from "../strings";

import { CheckboxField } from "./CheckboxField";

const s = employerStrings.job;

// Up to 10 questions applicants answer when applying. Locked once the job has applications.
export function ScreeningQuestionsField({ locked }: { locked: boolean }) {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<JobFormInput>();
  const { fields, append, remove } = useFieldArray({ control, name: "questions" });

  return (
    <fieldset className="space-y-4">
      <legend className="text-base font-semibold">{s.questionsTitle}</legend>
      <p className="text-sm text-muted-foreground">{locked ? s.questionsLocked : s.questionsHint}</p>

      {fields.length > 0 && (
        <ol className="space-y-4">
          {fields.map((field, index) => {
            const id = `questions.${index}.question`;
            const error = errors.questions?.[index]?.question?.message;
            return (
              <li key={field.id} className="space-y-2 rounded-lg border p-3">
                <Label htmlFor={id}>{s.questionLabel(index + 1)}</Label>
                <div className="flex gap-2">
                  <Input
                    id={id}
                    className="h-11 text-base"
                    maxLength={300}
                    disabled={locked}
                    aria-invalid={Boolean(error)}
                    {...register(`questions.${index}.question`)}
                  />
                  {!locked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0"
                      aria-label={s.removeQuestion(index + 1)}
                      onClick={() => remove(index)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  )}
                </div>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <CheckboxField<JobFormInput>
                  name={`questions.${index}.isRequired`}
                  label={s.questionRequired}
                  disabled={locked}
                />
              </li>
            );
          })}
        </ol>
      )}

      {!locked && fields.length < MAX_QUESTIONS && (
        <Button type="button" variant="outline" className="h-11" onClick={() => append({ question: "", isRequired: false })}>
          <Plus aria-hidden="true" />
          {s.addQuestion}
        </Button>
      )}
    </fieldset>
  );
}
