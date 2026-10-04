"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/features/employer/components/SelectField";
import { Field } from "@/features/profiles/components/Field";
import { SwitchRow } from "@/features/profiles/seeker/components/SwitchRow";

import { MultiCheckGroup } from "../../relocation/components/MultiCheckGroup";
import { NEED_LABELS } from "../../relocation/labels";
import { RELOCATION_NEEDS } from "../../relocation/schemas";
import type { CityOption, NeighbourhoodOption } from "../../relocation/types";
import { saveBuddyProfile } from "../actions";
import { buddyProfileSchema, type BuddyProfileValues } from "../schemas";
import { buddyStrings } from "../strings";

const s = buddyStrings.profile;
const HELP_OPTIONS = RELOCATION_NEEDS.map((value) => ({ value, label: NEED_LABELS[value] }));

type Props = {
  isNew: boolean;
  defaults: BuddyProfileValues;
  cities: CityOption[];
  neighbourhoods: NeighbourhoodOption[];
};

export function BuddyProfileForm({ isNew, defaults, cities, neighbourhoods }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<BuddyProfileValues>({
    resolver: zodResolver(buddyProfileSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });
  const { register, control, formState, setValue } = form;
  const cityId = useWatch({ control, name: "cityId" });
  const areaOptions = neighbourhoods.filter((n) => n.city_id === cityId).map((n) => ({ value: n.id, label: n.name }));

  function onSubmit() {
    const values = form.getValues();
    setSubmitError(null);
    startTransition(async () => {
      const result = await saveBuddyProfile(values);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      toast.success(s.saved);
      router.refresh();
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <SelectField<BuddyProfileValues>
          name="cityId"
          label={s.city}
          placeholder={s.cityPlaceholder}
          options={cities.map((c) => ({ value: c.id, label: c.name }))}
          onValueChange={() => setValue("neighbourhoodIds", [])}
        />
        <Controller
          control={control}
          name="neighbourhoodIds"
          render={({ field }) => (
            <MultiCheckGroup
              name="buddy-areas"
              legend={s.neighbourhoods}
              options={areaOptions}
              value={field.value}
              onChange={field.onChange}
              emptyText={s.noNeighbourhoods}
            />
          )}
        />
        <Field id="bio" label={s.bio} hint={s.bioHint} error={formState.errors.bio?.message}>
          <Textarea id="bio" rows={4} maxLength={1000} className="text-base" {...register("bio")} />
        </Field>
        <Field id="languages" label={s.languages} hint={s.languagesHint} error={formState.errors.languages?.message}>
          <Input id="languages" maxLength={300} className="h-11 text-base" {...register("languages")} />
        </Field>
        <Controller
          control={control}
          name="helpTypes"
          render={({ field, fieldState }) => (
            <MultiCheckGroup
              name="helpTypes"
              legend={s.helpTypes}
              options={HELP_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <SwitchRow id="isActive" label={s.active} hint={s.activeHint} checked={field.value} onCheckedChange={field.onChange} />
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
