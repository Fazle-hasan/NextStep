"use client";

import { Controller, useFormContext } from "react-hook-form";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

import { INTENTS, type OnboardingInput } from "../schemas";
import { intentStrings, onboardingStrings as s } from "../strings";

export function IntentsStep() {
  const {
    control,
    formState: { errors },
  } = useFormContext<OnboardingInput>();

  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 text-sm text-muted-foreground">{s.intentsHint}</legend>
      <Controller
        control={control}
        name="intents"
        render={({ field }) => {
          const selected = field.value ?? [];
          return (
            <div className="grid gap-3">
              {INTENTS.map((intent) => {
                const checked = selected.includes(intent);
                const id = `intent-${intent}`;
                return (
                  <Label
                    key={intent}
                    htmlFor={id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={(value) =>
                        field.onChange(value === true ? [...selected, intent] : selected.filter((i) => i !== intent))
                      }
                      onBlur={field.onBlur}
                      className="mt-0.5"
                    />
                    <span className="space-y-1">
                      <span className="block font-medium">{intentStrings[intent].title}</span>
                      <span className="block text-sm text-muted-foreground">{intentStrings[intent].description}</span>
                    </span>
                  </Label>
                );
              })}
            </div>
          );
        }}
      />
      {errors.intents && (
        <p role="alert" className="text-sm text-destructive">
          {errors.intents.message}
        </p>
      )}
    </fieldset>
  );
}
