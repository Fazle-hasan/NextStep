"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, FormProvider, useForm, type DefaultValues } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SkillPicker } from "@/features/jobs/components/SkillPicker";
import type { NeighbourhoodOption, SkillOption } from "@/features/jobs/types";
import type { CityOption } from "@/features/profiles/queries";
import type { Enums } from "@/types/database";

import { saveJob } from "../job-actions";
import { MAX_JOB_SKILLS, jobFormSchema, type JobFormInput, type JobFormValues } from "../schemas";
import { employerStrings } from "../strings";

import { JobBasicsFields } from "./JobBasicsFields";
import { JobLocationFields } from "./JobLocationFields";
import { jobStatusMessage } from "./JobRowActions";
import { JobSalaryFields } from "./JobSalaryFields";
import { ScreeningQuestionsField } from "./ScreeningQuestionsField";

const s = employerStrings.job;

type Props = {
  companyId: string;
  companyVerified: boolean;
  // Present when editing.
  jobId?: string;
  status?: Enums<"job_status">;
  questionsLocked?: boolean;
  defaults: DefaultValues<JobFormInput>;
  cities: CityOption[];
  neighbourhoods: NeighbourhoodOption[];
  skills: SkillOption[];
};

export function JobForm({
  companyId,
  companyVerified,
  jobId,
  status = "draft",
  questionsLocked = false,
  defaults,
  cities,
  neighbourhoods,
  skills,
}: Props) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<JobFormInput, unknown, JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });
  const canPublish = status === "draft" || status === "closed";

  // `values` is the raw form input: the server action validates and converts it with the same schema.
  // (The resolver's converted output would fail that second validation, e.g. salary already turned into a number.)
  function save(values: JobFormInput, publish: boolean) {
    setPublishing(publish);
    setSubmitError(null);
    startTransition(async () => {
      const result = await saveJob({ jobId, companyId, publish, values });
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      if (result.data.publishError) toast.error(result.data.publishError);
      else toast.success(publish ? jobStatusMessage(result.data.status) : s.savedDraft);
      router.push("/employer");
      router.refresh();
    });
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(event) => {
          // Which button was pressed: "Save and publish" carries data-intent="publish".
          const submitter = (event.nativeEvent as SubmitEvent).submitter;
          const publish = submitter?.dataset.intent === "publish";
          void form.handleSubmit(() => save(form.getValues(), publish))(event);
        }}
        className="space-y-8"
        noValidate
      >
        <JobBasicsFields />
        <Separator />
        <JobLocationFields cities={cities} neighbourhoods={neighbourhoods} />
        <Separator />
        <div className="space-y-2">
          <Label htmlFor="skillIds">{s.skills}</Label>
          <Controller
            control={form.control}
            name="skillIds"
            render={({ field, fieldState }) => (
              <>
                <SkillPicker id="skillIds" skills={skills} value={field.value} onChange={field.onChange} max={MAX_JOB_SKILLS} />
                {fieldState.error && (
                  <p role="alert" className="text-sm text-destructive">
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
          />
        </div>
        <Separator />
        <JobSalaryFields />
        <Separator />
        <ScreeningQuestionsField locked={questionsLocked} />

        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
        <div className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              variant={canPublish ? "outline" : "default"}
              className="h-11 text-base sm:px-6"
              disabled={pending}
            >
              {pending && !publishing ? s.saving : status === "draft" ? s.saveDraft : s.save}
            </Button>
            {canPublish && (
              <Button
                type="submit"
                className="h-11 text-base sm:px-6"
                disabled={pending || !companyVerified}
                data-intent="publish"
              >
                {pending && publishing ? s.saving : s.saveAndPublish}
              </Button>
            )}
          </div>
          {canPublish && !companyVerified && <p className="text-sm text-muted-foreground">{s.cannotPublishHint}</p>}
        </div>
      </form>
    </FormProvider>
  );
}
