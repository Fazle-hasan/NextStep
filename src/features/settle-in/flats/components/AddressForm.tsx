"use client";

import { LocateFixed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAreaCentre } from "@/features/places/map/useAreaCentre";
import { Field } from "@/features/profiles/components/Field";
import { isMapConfigured, PinPicker, type MapPoint } from "@/lib/maps";

import { saveListingAddress } from "../actions";
import type { AddressFormInput } from "../schemas";
import { flatsStrings } from "../strings";

const s = flatsStrings.address;

type Props = {
  listingId: string;
  defaults: AddressFormInput;
  // True when a location pin is already saved for this listing.
  hasSavedPin: boolean;
  // The pin saved earlier (only the lister ever gets this), shown on the map picker.
  savedPoint?: MapPoint | null;
  // The listing's area, so the map picker opens there when no pin is saved yet.
  cityId?: string | null;
  neighbourhoodId?: string | null;
};

// The private exact address. The lister places the pin on the map or taps "Use my current location";
// without a pin the server falls back to the neighbourhood (or city) centre.
export function AddressForm({ listingId, defaults, hasSavedPin, savedPoint = null, cityId, neighbourhoodId }: Props) {
  const router = useRouter();
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<AddressFormInput>({ defaultValues: defaults });
  const areaCentre = useAreaCentre(cityId, neighbourhoodId);
  const mapAvailable = isMapConfigured();

  function locate() {
    setLocationError(null);
    if (!("geolocation" in navigator)) {
      setLocationError(s.locationDenied);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPoint({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError(s.locationDenied);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  function onSubmit(values: AddressFormInput) {
    setSubmitError(null);
    startTransition(async () => {
      // The server action validates the input again.
      const result = await saveListingAddress({ listingId, ...values, lat: point?.lat ?? null, lng: point?.lng ?? null });
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      toast.success(result.data.pin === "area" ? s.savedArea : s.saved);
      setPoint(null);
      router.refresh();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <Field id="addressLine" label={s.addressLine}>
        <Input
          id="addressLine"
          autoComplete="street-address"
          maxLength={300}
          placeholder={s.addressPlaceholder}
          className="h-11 text-base"
          required
          {...form.register("addressLine")}
        />
      </Field>
      <Field id="landmark" label={s.landmark}>
        <Input id="landmark" maxLength={200} className="h-11 text-base" {...form.register("landmark")} />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{s.locationTitle}</legend>
        {mapAvailable && (
          <PinPicker value={point ?? savedPoint} onChange={setPoint} initialCenter={areaCentre} ariaLabel={s.pickerLabel} />
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-11" disabled={locating} onClick={locate}>
            <LocateFixed aria-hidden="true" />
            {locating ? s.locating : s.useLocation}
          </Button>
          {point && (
            <Button type="button" variant="ghost" className="h-11" onClick={() => setPoint(null)}>
              {s.clearLocation}
            </Button>
          )}
        </div>
        <p role="status" className="text-sm font-medium">
          {point ? s.locationSet : hasSavedPin ? s.locationSaved : ""}
        </p>
        <p className="text-sm text-muted-foreground">{mapAvailable ? s.locationHintMap : s.locationHint}</p>
        {locationError && (
          <p role="alert" className="text-sm text-destructive">
            {locationError}
          </p>
        )}
      </fieldset>

      {submitError && (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      )}
      <Button type="submit" className="h-11 w-full text-base sm:w-auto sm:px-6" disabled={pending}>
        {pending ? s.saving : s.save}
      </Button>
    </form>
  );
}
