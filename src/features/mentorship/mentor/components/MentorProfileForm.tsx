"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/features/employer/components/SelectField";
import { SkillPicker } from "@/features/jobs/components/SkillPicker";
import type { SkillOption } from "@/features/jobs/types";
import { Field } from "@/features/profiles/components/Field";
import { NativeSelect } from "@/features/profiles/seeker/components/NativeSelect";
import { SwitchRow } from "@/features/profiles/seeker/components/SwitchRow";
import { MultiCheckGroup } from "@/features/settle-in/relocation/components/MultiCheckGroup";

import { SESSION_TYPE_LABELS } from "../../labels";
import { saveMentorProfile } from "../actions";
import { DURATIONS, mentorProfileSchema, SESSION_TYPES, type MentorProfileValues } from "../schemas";
import { mentorStrings } from "../strings";

const s = mentorStrings.profile;
const SESSION_TYPE_OPTIONS = SESSION_TYPES.map((value) => ({ value, label: SESSION_TYPE_LABELS[value] }));

type Props = {
  isNew: boolean;
  defaults: MentorProfileValues;
  cities: { id: string; name: string }[];
  skills: SkillOption[];
  timeZones: string[];
};

export function MentorProfileForm({ isNew, defaults, cities, skills, timeZones }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<MentorProfileValues>({
    resolver: zodResolver(mentorProfileSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });
  const { register, control, formState } = form;

  function onSubmit(values: MentorProfileValues) {
    setSubmitError(null);
    startTransition(async () => {
      const result = await saveMentorProfile(values);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      toast.success(s.saved);
      router.push("/mentor");
      router.refresh();
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Field id="headline" label={s.headline} hint={s.headlineHint} error={formState.errors.headline?.message}>
          <Input id="headline" maxLength={120} className="h-11 text-base" {...register("headline")} />
        </Field>
        <Field id="bio" label={s.bio} hint={s.bioHint} error={formState.errors.bio?.message}>
          <Textarea id="bio" rows={5} maxLength={2000} className="text-base" {...register("bio")} />
        </Field>
        <Field id="yearsExperience" label={s.years} error={formState.errors.yearsExperience?.message}>
          <Input id="yearsExperience" inputMode="numeric" maxLength={2} className="h-11 w-28 text-base" {...register("yearsExperience")} />
        </Field>
        <Field id="industries" label={s.industries} hint={s.industriesHint} error={formState.errors.industries?.message}>
          <Input id="industries" maxLength={700} className="h-11 text-base" {...register("industries")} />
        </Field>
        <Field id="languages" label={s.languages} hint={s.languagesHint} error={formState.errors.languages?.message}>
          <Input id="languages" maxLength={700} className="h-11 text-base" {...register("languages")} />
        </Field>
        <SelectField<MentorProfileValues>
          name="cityId"
          label={s.city}
          placeholder={s.cityPlaceholder}
          emptyLabel={s.noCity}
          options={cities.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Field id="timezone" label={s.timezone} hint={s.timezoneHint} error={formState.errors.timezone?.message}>
          <NativeSelect id="timezone" {...register("timezone")}>
            {timeZones.map((zone) => (
              <option key={zone} value={zone}>
                {zone.replaceAll("_", " ")}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Controller
          control={control}
          name="sessionTypes"
          render={({ field, fieldState }) => (
            <MultiCheckGroup
              name="sessionTypes"
              legend={s.sessionTypes}
              options={SESSION_TYPE_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Field id="defaultDurationMin" label={s.duration} error={formState.errors.defaultDurationMin?.message}>
          <NativeSelect id="defaultDurationMin" className="sm:w-48" {...register("defaultDurationMin")}>
            {DURATIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {s.minutes(Number(minutes))}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Controller
          control={control}
          name="skillIds"
          render={({ field, fieldState }) => (
            <Field id="mentor-skills" label={s.skills} hint={s.skillsHint} error={fieldState.error?.message}>
              <SkillPicker id="mentor-skills" skills={skills} value={field.value} onChange={field.onChange} />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="isAccepting"
          render={({ field }) => (
            <SwitchRow id="isAccepting" label={s.accepting} hint={s.acceptingHint} checked={field.value} onCheckedChange={field.onChange} />
          )}
        />

        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
        <Button type="submit" className="h-11 w-full text-base sm:w-auto sm:px-6" disabled={pending}>
          {pending ? s.saving : isNew ? s.submitCreate : s.save}
        </Button>
      </form>
    </FormProvider>
  );
}
