"use client";

import { Controller, useFormContext } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/features/employer/components/SelectField";
import { Field } from "@/features/profiles/components/Field";

import { AMENITY_KEYS, AMENITY_LABELS, FOOD_PREF_LABELS, FURNISHING_LABELS, TENANT_GENDER_LABELS, type AmenityKey } from "../labels";
import { FOOD_PREFS, FURNISHINGS, TENANT_GENDER_PREFS, type ListingFormInput } from "../schemas";
import { flatsStrings } from "../strings";

const s = flatsStrings.form;
const FURNISHING_OPTIONS = FURNISHINGS.map((value) => ({ value, label: FURNISHING_LABELS[value] }));
const FOOD_OPTIONS = FOOD_PREFS.map((value) => ({ value, label: FOOD_PREF_LABELS[value] }));
const TENANT_OPTIONS = TENANT_GENDER_PREFS.map((value) => ({ value, label: TENANT_GENDER_LABELS[value] }));

type NumberName = "rent" | "deposit" | "minStayMonths" | "bedrooms" | "bathrooms";

// Money, dates, rooms, amenities and preferences of a listing. Lives inside ListingForm's FormProvider.
export function ListingDetailFields() {
  const { register, control, formState } = useFormContext<ListingFormInput>();

  function numberField(name: NumberName, label: string, hint?: string) {
    return (
      <Field id={name} label={label} hint={hint} error={formState.errors[name]?.message}>
        <Input
          id={name}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className="h-11 text-base"
          aria-invalid={Boolean(formState.errors[name])}
          {...register(name)}
        />
      </Field>
    );
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        {numberField("rent", s.rent)}
        {numberField("deposit", s.deposit, s.depositHint)}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="availableFrom" label={s.availableFrom} error={formState.errors.availableFrom?.message}>
          <Input
            id="availableFrom"
            type="date"
            className="h-11 text-base"
            aria-invalid={Boolean(formState.errors.availableFrom)}
            {...register("availableFrom")}
          />
        </Field>
        {numberField("minStayMonths", s.minStay)}
      </div>
      <div className="grid grid-cols-2 gap-5">
        {numberField("bedrooms", s.bedrooms)}
        {numberField("bathrooms", s.bathrooms)}
      </div>
      <SelectField<ListingFormInput> name="furnishing" label={s.furnishing} placeholder={s.furnishing} options={FURNISHING_OPTIONS} />

      <Controller
        control={control}
        name="amenities"
        render={({ field }) => (
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">{s.amenities}</legend>
            <div className="grid sm:grid-cols-2">
              {AMENITY_KEYS.map((key: AmenityKey) => (
                <div key={key} className="flex min-h-11 items-center gap-3">
                  <Checkbox
                    id={`amenity-${key}`}
                    checked={field.value.includes(key)}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true ? [...field.value, key] : field.value.filter((v) => v !== key))
                    }
                    className="size-5"
                  />
                  <Label htmlFor={`amenity-${key}`} className="font-normal">
                    {AMENITY_LABELS[key]}
                  </Label>
                </div>
              ))}
            </div>
          </fieldset>
        )}
      />

      <SelectField<ListingFormInput>
        name="foodPref"
        label={s.food}
        placeholder={s.foodNone}
        options={FOOD_OPTIONS}
        emptyLabel={s.foodNone}
      />
      <SelectField<ListingFormInput>
        name="tenantGenderPref"
        label={s.tenants}
        placeholder={s.tenants}
        hint={s.tenantsHint}
        options={TENANT_OPTIONS}
      />
    </>
  );
}
