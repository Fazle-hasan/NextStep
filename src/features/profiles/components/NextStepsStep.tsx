"use client";

import { useFormContext, useWatch } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import type { OnboardingInput } from "../schemas";
import { intentStrings, onboardingStrings as s } from "../strings";

import { Field } from "./Field";

export function NextStepsStep() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<OnboardingInput>();
  const intents = useWatch({ control, name: "intents" }) ?? [];
  const needsNote = intents.some((i) => intentStrings[i].needsVerification);

  return (
    <div className="space-y-5">
      <ul className="space-y-3">
        {intents.map((intent) => (
          <li key={intent} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{intentStrings[intent].title}</span>
              {intentStrings[intent].needsVerification && <Badge variant="secondary">{s.pendingVerification}</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{intentStrings[intent].nextStep}</p>
          </li>
        ))}
      </ul>

      {needsNote && (
        <Field
          id="verificationNote"
          label={s.verificationNote}
          hint={s.verificationNoteHint}
          error={errors.verificationNote?.message}
        >
          <Textarea
            id="verificationNote"
            rows={4}
            maxLength={1000}
            className="text-base"
            aria-invalid={Boolean(errors.verificationNote)}
            {...register("verificationNote")}
          />
        </Field>
      )}
    </div>
  );
}
