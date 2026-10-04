"use client";

import { useFormContext } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EXPERIENCE_LEVEL_LABELS, JOB_TYPE_LABELS, WORK_MODE_LABELS } from "@/features/jobs/labels";
import { Field } from "@/features/profiles/components/Field";

import { EXPERIENCE_LEVELS, JOB_TYPES, WORK_MODES, todayInIndia, type JobFormInput } from "../schemas";
import { employerStrings } from "../strings";

import { SelectField } from "./SelectField";

const s = employerStrings.job;

const JOB_TYPE_OPTIONS = JOB_TYPES.map((value) => ({ value, label: JOB_TYPE_LABELS[value] }));
const WORK_MODE_OPTIONS = WORK_MODES.map((value) => ({ value, label: WORK_MODE_LABELS[value] }));
const LEVEL_OPTIONS = EXPERIENCE_LEVELS.map((value) => ({ value, label: EXPERIENCE_LEVEL_LABELS[value] }));

// Title, description, type, mode, level, openings and deadline.
export function JobBasicsFields() {
  const {
    register,
    formState: { errors },
  } = useFormContext<JobFormInput>();

  return (
    <div className="space-y-5">
      <Field id="title" label={s.title} error={errors.title?.message}>
        <Input id="title" className="h-11 text-base" maxLength={140} aria-invalid={Boolean(errors.title)} {...register("title")} />
      </Field>
      <Field id="description" label={s.description} hint={s.descriptionHint} error={errors.description?.message}>
        <Textarea
          id="description"
          rows={8}
          maxLength={8000}
          className="text-base"
          aria-invalid={Boolean(errors.description)}
          {...register("description")}
        />
      </Field>
      <Field id="requirements" label={s.requirements} hint={s.requirementsHint} error={errors.requirements?.message}>
        <Textarea id="requirements" rows={5} maxLength={4000} className="text-base" {...register("requirements")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <SelectField<JobFormInput> name="jobType" label={s.jobType} placeholder={s.choose} options={JOB_TYPE_OPTIONS} />
        <SelectField<JobFormInput> name="workMode" label={s.workMode} placeholder={s.choose} options={WORK_MODE_OPTIONS} />
        <SelectField<JobFormInput> name="experienceLevel" label={s.level} placeholder={s.choose} options={LEVEL_OPTIONS} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="openings" label={s.openings} error={errors.openings?.message}>
          <Input
            id="openings"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            className="h-11 text-base"
            aria-invalid={Boolean(errors.openings)}
            {...register("openings", { valueAsNumber: true })}
          />
        </Field>
        <Field id="applicationDeadline" label={s.deadline} error={errors.applicationDeadline?.message}>
          <Input
            id="applicationDeadline"
            type="date"
            min={todayInIndia()}
            className="h-11 text-base"
            aria-invalid={Boolean(errors.applicationDeadline)}
            {...register("applicationDeadline")}
          />
        </Field>
      </div>
    </div>
  );
}
