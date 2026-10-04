"use client";

import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";

import { Field } from "@/features/profiles/components/Field";
import { NativeSelect } from "@/features/profiles/seeker/components/NativeSelect";
import { SwitchRow } from "@/features/profiles/seeker/components/SwitchRow";

import {
  FOOD_HABIT_LABELS,
  GUESTS_POLICY_LABELS,
  PREFERRED_GENDER_LABELS,
  SLEEP_SCHEDULE_LABELS,
  WORK_SCHEDULE_LABELS,
} from "../labels";
import {
  CLEANLINESS_LEVELS,
  FOOD_HABITS,
  GUESTS_POLICIES,
  PREFERRED_GENDERS,
  SLEEP_SCHEDULES,
  WORK_SCHEDULES,
  type FlatmateProfileInput,
  type FlatmateProfileValues,
} from "../schemas";
import { flatmateStrings as s } from "../strings";

type Props = {
  register: UseFormRegister<FlatmateProfileInput>;
  control: Control<FlatmateProfileInput, unknown, FlatmateProfileValues>;
  errors: FieldErrors<FlatmateProfileInput>;
};

function options<T extends string>(values: readonly T[], labels: Record<T, string>) {
  return values.map((value) => (
    <option key={value} value={value}>
      {labels[value]}
    </option>
  ));
}

// Preference and lifestyle fields of the flatmate profile form.
export function HabitsFields({ register, control, errors }: Props) {
  const p = s.profile;
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="preferredGender" label={p.preferredGender} error={errors.preferredGender?.message}>
          <NativeSelect id="preferredGender" {...register("preferredGender")}>
            {options(PREFERRED_GENDERS, PREFERRED_GENDER_LABELS)}
          </NativeSelect>
        </Field>
        <Field id="foodHabit" label={p.foodHabit} error={errors.foodHabit?.message}>
          <NativeSelect id="foodHabit" {...register("foodHabit")}>
            {options(FOOD_HABITS, FOOD_HABIT_LABELS)}
          </NativeSelect>
        </Field>
        <Field id="sleepSchedule" label={p.sleepSchedule} error={errors.sleepSchedule?.message}>
          <NativeSelect id="sleepSchedule" {...register("sleepSchedule")}>
            {options(SLEEP_SCHEDULES, SLEEP_SCHEDULE_LABELS)}
          </NativeSelect>
        </Field>
        <Field id="workSchedule" label={p.workSchedule} error={errors.workSchedule?.message}>
          <NativeSelect id="workSchedule" {...register("workSchedule")}>
            {options(WORK_SCHEDULES, WORK_SCHEDULE_LABELS)}
          </NativeSelect>
        </Field>
        <Field id="cleanliness" label={p.cleanliness} hint={p.cleanlinessHint} error={errors.cleanliness?.message}>
          <NativeSelect id="cleanliness" {...register("cleanliness")}>
            {CLEANLINESS_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="guestsPolicy" label={p.guestsPolicy} error={errors.guestsPolicy?.message}>
          <NativeSelect id="guestsPolicy" {...register("guestsPolicy")}>
            {options(GUESTS_POLICIES, GUESTS_POLICY_LABELS)}
          </NativeSelect>
        </Field>
      </div>

      <Controller
        control={control}
        name="smokes"
        render={({ field }) => (
          <SwitchRow id="smokes" label={p.smokes} checked={field.value} onCheckedChange={field.onChange} />
        )}
      />
      <Controller
        control={control}
        name="okWithSmoker"
        render={({ field }) => (
          <SwitchRow id="okWithSmoker" label={p.okWithSmoker} checked={field.value} onCheckedChange={field.onChange} />
        )}
      />
    </>
  );
}
