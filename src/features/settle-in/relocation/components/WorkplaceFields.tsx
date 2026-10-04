"use client";

import { MapPinIcon } from "lucide-react";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/features/profiles/components/Field";

import type { RequestFormValues } from "../schemas";
import { relocationStrings } from "../strings";

const s = relocationStrings.form;

// Workplace address plus an optional pin from the browser's location (the map picker arrives with the maps module).
export function WorkplaceFields() {
  const { register, setValue, control, formState } = useFormContext<RequestFormValues>();
  const pinAction = useWatch({ control, name: "pinAction" });
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);

  function useCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError(true);
      return;
    }
    setLocating(true);
    setLocationError(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue("workplaceLat", position.coords.latitude, { shouldDirty: true });
        setValue("workplaceLng", position.coords.longitude, { shouldDirty: true });
        setValue("pinAction", "set", { shouldDirty: true });
        setLocating(false);
      },
      () => {
        setLocationError(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  function removePin() {
    setValue("workplaceLat", null, { shouldDirty: true });
    setValue("workplaceLng", null, { shouldDirty: true });
    setValue("pinAction", "clear", { shouldDirty: true });
  }

  return (
    <div className="space-y-3">
      <Field id="workplaceAddress" label={s.workplaceAddress} hint={s.workplaceHint} error={formState.errors.workplaceAddress?.message}>
        <Input id="workplaceAddress" maxLength={300} className="h-11 text-base" {...register("workplaceAddress")} />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className="h-11" onClick={useCurrentLocation} disabled={locating}>
          <MapPinIcon aria-hidden="true" />
          {locating ? s.locating : s.useLocation}
        </Button>
        {pinAction !== "clear" && (
          <Button type="button" variant="ghost" className="h-11" onClick={removePin}>
            {s.removePin}
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {pinAction === "set" && s.pinSet}
        {pinAction === "keep" && s.pinSaved}
      </p>
      {locationError && (
        <p role="alert" className="text-sm text-destructive">
          {s.locationDenied}
        </p>
      )}
    </div>
  );
}
