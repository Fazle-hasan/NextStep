"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { COMPANY_SIZE_LABELS } from "@/features/jobs/labels";
import { Field } from "@/features/profiles/components/Field";

import { createCompany, updateCompany } from "../actions";
import { COMPANY_SIZES, companyCreateSchema, type CompanyFormInput, type CompanyFormValues } from "../schemas";
import { employerStrings } from "../strings";

import { CheckboxField } from "./CheckboxField";
import { SelectField } from "./SelectField";

const s = employerStrings.company;
const SIZE_OPTIONS = COMPANY_SIZES.map((value) => ({ value, label: COMPANY_SIZE_LABELS[value] }));

type Props = {
  // Present when editing an existing company; absent when registering a new one.
  companyId?: string;
  defaults: CompanyFormInput;
};

export function CompanyForm({ companyId, defaults }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<CompanyFormInput, unknown, CompanyFormValues>({
    resolver: zodResolver(companyCreateSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });
  const { register, formState } = form;
  const isEdit = Boolean(companyId);

  function onSubmit() {
    // Send the raw form input: the server action validates and converts it with the same schema.
    // (The resolver's converted output would fail that second validation, e.g. "" already turned into undefined.)
    const values = form.getValues();
    setSubmitError(null);
    startTransition(async () => {
      if (companyId) {
        const result = await updateCompany({ ...values, companyId });
        if (!result.ok) {
          setSubmitError(result.error);
          return;
        }
        toast.success(s.saved);
        router.refresh();
        return;
      }
      const result = await createCompany(values);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      router.replace(`/employer/company/${result.data.companyId}/edit`);
      router.refresh();
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Field id="name" label={s.name} error={formState.errors.name?.message}>
          <Input
            id="name"
            autoComplete="organization"
            className="h-11 text-base"
            aria-invalid={Boolean(formState.errors.name)}
            {...register("name")}
          />
        </Field>
        <Field id="industry" label={s.industry} error={formState.errors.industry?.message}>
          <Input id="industry" placeholder={s.industryPlaceholder} className="h-11 text-base" {...register("industry")} />
        </Field>
        <SelectField<CompanyFormInput> name="size" label={s.size} placeholder={s.sizePlaceholder} options={SIZE_OPTIONS} />
        <Field id="website" label={s.website} hint={s.websiteHint} error={formState.errors.website?.message}>
          <Input
            id="website"
            type="url"
            inputMode="url"
            autoComplete="url"
            placeholder="https://"
            className="h-11 text-base"
            aria-invalid={Boolean(formState.errors.website)}
            {...register("website")}
          />
        </Field>
        <Field id="description" label={s.description} error={formState.errors.description?.message}>
          <Textarea id="description" rows={5} maxLength={4000} className="text-base" {...register("description")} />
        </Field>
        <div>
          <CheckboxField<CompanyFormInput> name="isCommunityOwned" label={s.communityOwned} />
          <CheckboxField<CompanyFormInput> name="leapFriendly" label={s.leapFriendly} hint={s.leapFriendlyHint} />
        </div>
        {!isEdit && (
          <Field
            id="verificationNote"
            label={s.verificationNote}
            hint={s.verificationNoteHint}
            error={formState.errors.verificationNote?.message}
          >
            <Textarea id="verificationNote" rows={3} maxLength={1000} className="text-base" {...register("verificationNote")} />
          </Field>
        )}

        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
        <Button type="submit" className="h-11 w-full text-base sm:w-auto sm:px-6" disabled={pending}>
          {pending ? s.saving : isEdit ? s.save : s.create}
        </Button>
      </form>
    </FormProvider>
  );
}
