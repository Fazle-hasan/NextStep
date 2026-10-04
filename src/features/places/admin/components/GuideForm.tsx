"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/profiles/components/Field";
import { SwitchRow } from "@/features/profiles/seeker/components/SwitchRow";

import { saveGuide } from "../actions";
import { guideFormSchema, LISTING_TYPES, type GuideFormInput, type GuideFormValues } from "../schemas";
import { placesAdminStrings } from "../strings";

const s = placesAdminStrings;

// Write or edit the guide for one neighbourhood.
export function GuideForm({ initial }: { initial: GuideFormInput }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<GuideFormInput, unknown, GuideFormValues>({
    resolver: zodResolver(guideFormSchema),
    defaultValues: initial,
  });
  const { register, control, setValue, formState } = form;
  const e = formState.errors;
  const isPublished = useWatch({ control, name: "isPublished" });

  function onSubmit() {
    setSubmitError(null);
    startTransition(async () => {
      const result = await saveGuide(form.getValues());
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      toast.success(s.saved);
      router.refresh();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
      <Field id="guide-summary" label={s.guide.summary} error={e.summary?.message}>
        <Textarea id="guide-summary" rows={6} maxLength={5000} aria-invalid={Boolean(e.summary)} {...register("summary")} />
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">{s.guide.rentHeading}</legend>
        <p className="text-sm text-muted-foreground">{s.guide.rentHint}</p>
        {LISTING_TYPES.map((type) => {
          const rowError = e.rent?.[type]?.min?.message ?? e.rent?.[type]?.max?.message;
          return (
            <div key={type} className="space-y-2">
              <p className="text-sm font-medium">{s.listingTypes[type]}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`rent-${type}-min`} className="text-xs text-muted-foreground">
                    {s.guide.min}
                  </Label>
                  <Input
                    id={`rent-${type}-min`}
                    inputMode="numeric"
                    maxLength={8}
                    className="h-11"
                    aria-invalid={Boolean(rowError)}
                    {...register(`rent.${type}.min`)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`rent-${type}-max`} className="text-xs text-muted-foreground">
                    {s.guide.max}
                  </Label>
                  <Input
                    id={`rent-${type}-max`}
                    inputMode="numeric"
                    maxLength={8}
                    className="h-11"
                    aria-invalid={Boolean(rowError)}
                    {...register(`rent.${type}.max`)}
                  />
                </div>
              </div>
              {rowError && (
                <p role="alert" className="text-sm text-destructive">
                  {rowError}
                </p>
              )}
            </div>
          );
        })}
      </fieldset>

      <Field id="guide-commute" label={s.guide.commute} error={e.commuteNotes?.message}>
        <Textarea id="guide-commute" rows={3} maxLength={2000} {...register("commuteNotes")} />
      </Field>
      <Field id="guide-safety" label={s.guide.safety} error={e.safetyNotes?.message}>
        <Textarea id="guide-safety" rows={3} maxLength={2000} {...register("safetyNotes")} />
      </Field>
      <Field id="guide-food" label={s.guide.halalFood} error={e.halalFoodNotes?.message}>
        <Textarea id="guide-food" rows={3} maxLength={2000} {...register("halalFoodNotes")} />
      </Field>
      <SwitchRow
        id="guide-published"
        label={s.guide.published}
        hint={s.guide.publishedHint}
        checked={isPublished}
        onCheckedChange={(checked) => setValue("isPublished", checked, { shouldDirty: true })}
      />
      {submitError && (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      )}
      <Button type="submit" className="h-11 w-full sm:w-auto" disabled={pending}>
        {pending ? s.working : s.guide.save}
      </Button>
    </form>
  );
}
