"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormProvider, useForm, type DefaultValues } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { completeOnboarding } from "../actions";
import { onboardingSchema, type OnboardingInput, type OnboardingValues } from "../schemas";
import type { CityOption } from "../queries";
import { onboardingStrings as s } from "../strings";

import { AboutYouStep } from "./AboutYouStep";
import { IntentsStep } from "./IntentsStep";
import { NextStepsStep } from "./NextStepsStep";

type Props = {
  cities: CityOption[];
  defaults: DefaultValues<OnboardingInput>;
  genderLocked: boolean;
  needsPhone: boolean;
  isUpdate: boolean;
  next?: string;
};

const STEP_FIELDS: (keyof OnboardingInput)[][] = [["fullName", "gender", "cityId", "phone"], ["intents"], []];

export function OnboardingWizard({ cities, defaults, genderLocked, needsPhone, isUpdate, next }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<OnboardingInput, unknown, OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });

  const isLast = step === STEP_FIELDS.length - 1;

  async function goNext() {
    const fields = STEP_FIELDS[step] ?? [];
    if (step === 0 && needsPhone && !form.getValues("phone")) {
      form.setError("phone", { message: s.errors.phone_required });
      return;
    }
    if (await form.trigger(fields)) setStep((n) => n + 1);
  }

  function onSubmit(values: OnboardingValues) {
    setSubmitError(null);
    startTransition(async () => {
      const result = await completeOnboarding(values, next);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      router.replace(result.data.redirectTo);
      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <p className="text-sm font-medium text-primary">{s.stepLabel(step + 1, STEP_FIELDS.length)}</p>
        <CardTitle className="text-xl">{s.steps[step]}</CardTitle>
        <CardDescription>{isUpdate ? s.titleUpdate : s.title}</CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form
            onSubmit={(event) => {
              // Enter on an earlier step moves forward instead of saving and skipping steps.
              if (!isLast) {
                event.preventDefault();
                void goNext();
                return;
              }
              void form.handleSubmit(onSubmit)(event);
            }}
            className="space-y-6"
            noValidate
          >
            {step === 0 && <AboutYouStep cities={cities} genderLocked={genderLocked} needsPhone={needsPhone} />}
            {step === 1 && <IntentsStep />}
            {step === 2 && <NextStepsStep />}

            {submitError && (
              <p role="alert" className="text-sm text-destructive">
                {submitError}
              </p>
            )}

            <div className="flex gap-3">
              {step > 0 && (
                <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setStep((n) => n - 1)}>
                  {s.back}
                </Button>
              )}
              {/* Distinct keys so React never reuses the "Continue" button as the submit button
                  (the click that advances a step would otherwise also submit the form). */}
              {isLast ? (
                <Button key="finish" type="submit" className="h-11 flex-1" disabled={pending}>
                  {pending ? s.saving : s.finish}
                </Button>
              ) : (
                <Button key="next" type="submit" className="h-11 flex-1">
                  {s.next}
                </Button>
              )}
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
