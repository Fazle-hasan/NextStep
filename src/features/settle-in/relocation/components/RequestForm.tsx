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

import { createRelocationRequest, updateRelocationRequest } from "../actions";
import { HOUSEHOLD_LABELS, NEED_LABELS } from "../labels";
import { HOUSEHOLD_TYPES, RELOCATION_NEEDS, requestFormSchema, type RequestFormValues } from "../schemas";
import { relocationStrings } from "../strings";
import type { CityOption, NeighbourhoodOption } from "../types";

import { MultiCheckGroup } from "./MultiCheckGroup";
import { WorkplaceFields } from "./WorkplaceFields";

const s = relocationStrings.form;
const HOUSEHOLD_OPTIONS = HOUSEHOLD_TYPES.map((value) => ({ value, label: HOUSEHOLD_LABELS[value] }));
const NEED_OPTIONS = RELOCATION_NEEDS.map((value) => ({ value, label: NEED_LABELS[value] }));

type Props = {
  // Present when editing an open request.
  requestId?: string;
  defaults: RequestFormValues;
  cities: CityOption[];
  neighbourhoods: NeighbourhoodOption[];
};

export function RequestForm({ requestId, defaults, cities, neighbourhoods }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
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
      if (requestId) {
        const result = await updateRelocationRequest({ requestId, values });
        if (!result.ok) {
          setSubmitError(result.error);
          return;
        }
        toast.success(s.saved);
        router.refresh();
        return;
      }
      const result = await createRelocationRequest(values);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      router.replace(`/settle-in/${result.data.requestId}`);
      router.refresh();
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <SelectField<RequestFormValues>
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
              name="neighbourhoodIds"
              legend={s.neighbourhoods}
              options={areaOptions}
              value={field.value}
              onChange={field.onChange}
              emptyText={s.noNeighbourhoods}
            />
          )}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="moveFrom" label={s.moveFrom} error={formState.errors.moveFrom?.message}>
            <Input id="moveFrom" type="date" className="h-11 text-base" aria-invalid={Boolean(formState.errors.moveFrom)} {...register("moveFrom")} />
          </Field>
          <Field id="moveTo" label={s.moveTo} hint={s.moveToHint} error={formState.errors.moveTo?.message}>
            <Input id="moveTo" type="date" className="h-11 text-base" aria-invalid={Boolean(formState.errors.moveTo)} {...register("moveTo")} />
          </Field>
        </div>
        <WorkplaceFields />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="budgetMin" label={s.budgetMin} error={formState.errors.budgetMin?.message}>
            <Input id="budgetMin" inputMode="numeric" className="h-11 text-base" aria-invalid={Boolean(formState.errors.budgetMin)} {...register("budgetMin")} />
          </Field>
          <Field id="budgetMax" label={s.budgetMax} error={formState.errors.budgetMax?.message}>
            <Input id="budgetMax" inputMode="numeric" className="h-11 text-base" aria-invalid={Boolean(formState.errors.budgetMax)} {...register("budgetMax")} />
          </Field>
        </div>
        <SelectField<RequestFormValues> name="household" label={s.household} placeholder={s.householdPlaceholder} options={HOUSEHOLD_OPTIONS} />
        <Controller
          control={control}
          name="needs"
          render={({ field, fieldState }) => (
            <MultiCheckGroup
              name="needs"
              legend={s.needs}
              options={NEED_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Field id="note" label={s.note} hint={s.noteHint} error={formState.errors.note?.message}>
          <Textarea id="note" rows={4} maxLength={1000} className="text-base" {...register("note")} />
        </Field>
        <Controller
          control={control}
          name="sameGenderOnly"
          render={({ field }) => (
            <SwitchRow id="sameGenderOnly" label={s.sameGender} hint={s.sameGenderHint} checked={field.value} onCheckedChange={field.onChange} />
          )}
        />

        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
        <Button type="submit" className="h-11 w-full text-base sm:w-auto sm:px-6" disabled={pending}>
          {pending ? s.saving : requestId ? s.save : s.create}
        </Button>
      </form>
    </FormProvider>
  );
}
