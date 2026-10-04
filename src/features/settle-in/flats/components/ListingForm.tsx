"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/features/employer/components/SelectField";
import type { NeighbourhoodOption } from "@/features/jobs/types";
import { Field } from "@/features/profiles/components/Field";
import type { CityOption } from "@/features/profiles/queries";

import { createListing, updateListing } from "../actions";
import { LISTING_TYPE_LABELS } from "../labels";
import { LISTING_TYPES, listingCreateSchema, type ListingFormInput, type ListingFormValues } from "../schemas";
import { flatsStrings } from "../strings";

import { ListingDetailFields } from "./ListingDetailFields";

const s = flatsStrings.form;
const TYPE_OPTIONS = LISTING_TYPES.map((value) => ({ value, label: LISTING_TYPE_LABELS[value] }));

type Props = {
  // Present when editing; absent when creating.
  listingId?: string;
  defaults: ListingFormInput;
  cities: CityOption[];
  neighbourhoods: NeighbourhoodOption[];
};

// The public part of a listing. The exact address and photos are saved separately.
export function ListingForm({ listingId, defaults, cities, neighbourhoods }: Props) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<ListingFormInput, unknown, ListingFormValues>({
    resolver: zodResolver(listingCreateSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });
  const { register, formState, setValue } = form;
  const cityId = useWatch({ control: form.control, name: "cityId" });
  const areas = neighbourhoods.filter((n) => n.city_id === cityId).map((n) => ({ value: n.id, label: n.name }));

  function onSubmit() {
    // Send the raw form input: the server action validates and converts it with the same schema.
    const values = form.getValues();
    setSubmitError(null);
    startTransition(async () => {
      if (listingId) {
        const result = await updateListing({ ...values, listingId });
        if (!result.ok) {
          setSubmitError(result.error);
          return;
        }
        toast.success(s.saved);
        router.refresh();
        return;
      }
      const result = await createListing(values);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      router.replace(`/flats/${result.data.listingId}/edit`);
      router.refresh();
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <SelectField<ListingFormInput>
          name="listingType"
          label={s.listingType}
          placeholder={s.listingType}
          options={TYPE_OPTIONS}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField<ListingFormInput>
            name="cityId"
            label={s.city}
            placeholder={s.cityPlaceholder}
            options={cities.map((c) => ({ value: c.id, label: c.name }))}
            onValueChange={() => setValue("neighbourhoodId", "")}
          />
          <SelectField<ListingFormInput>
            name="neighbourhoodId"
            label={s.neighbourhood}
            placeholder={s.neighbourhoodPlaceholder}
            options={areas}
            emptyLabel={s.neighbourhoodNone}
            disabled={!cityId}
          />
        </div>
        <Field id="title" label={s.title} error={formState.errors.title?.message}>
          <Input
            id="title"
            maxLength={120}
            placeholder={s.titlePlaceholder}
            className="h-11 text-base"
            aria-invalid={Boolean(formState.errors.title)}
            {...register("title")}
          />
        </Field>
        <Field id="description" label={s.description} hint={s.descriptionHint} error={formState.errors.description?.message}>
          <Textarea id="description" rows={5} maxLength={4000} className="text-base" {...register("description")} />
        </Field>

        <ListingDetailFields />

        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
        <Button type="submit" className="h-11 w-full text-base sm:w-auto sm:px-6" disabled={pending}>
          {pending ? s.saving : listingId ? s.save : s.create}
        </Button>
      </form>
    </FormProvider>
  );
}
