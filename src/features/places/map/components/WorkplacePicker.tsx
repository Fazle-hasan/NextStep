"use client";

import { LocateFixed, MapPin } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { isMapConfigured, PinPicker, type MapPoint } from "@/lib/maps";

import { mapPageStrings } from "../strings";

const s = mapPageStrings.workplace;

type Props = {
  value: MapPoint | null;
  onChange: (point: MapPoint | null) => void;
  // The workplace saved on the viewer's open relocation request, offered as a shortcut.
  relocationWorkplace: MapPoint | null;
  // Where the picker opens when no workplace is set yet (the chosen city).
  initialCenter?: MapPoint;
};

// Sets the workplace used for the "distance from my workplace" filter: a pin on the map,
// the device location, or the workplace from the viewer's relocation request.
export function WorkplacePicker({ value, onChange, relocationWorkplace, initialCenter }: Props) {
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState<MapPoint | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const canPick = isMapConfigured();

  function locate() {
    setLocationError(false);
    if (!("geolocation" in navigator)) {
      setLocationError(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        setLocating(false);
        if (picking) setDraft(point);
        else onChange(point);
      },
      () => {
        setLocationError(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  function startPicking() {
    setDraft(value);
    setPicking(true);
  }

  function confirm() {
    if (draft) onChange(draft);
    setPicking(false);
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{s.title}</legend>
      <p role="status" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin className="size-4 shrink-0" aria-hidden="true" />
        {value ? s.set : s.none}
      </p>

      {picking && (
        <div className="space-y-2">
          <PinPicker value={draft} onChange={setDraft} initialCenter={initialCenter} ariaLabel={s.pickerLabel} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="h-11" disabled={!draft} onClick={confirm}>
              {s.done}
            </Button>
            <Button type="button" variant="ghost" className="h-11" onClick={() => setPicking(false)}>
              {s.cancel}
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canPick && !picking && (
          <Button type="button" variant="outline" className="h-11" onClick={startPicking}>
            {value ? s.changeButton : s.setButton}
          </Button>
        )}
        <Button type="button" variant="outline" className="h-11" disabled={locating} onClick={locate}>
          <LocateFixed aria-hidden="true" />
          {locating ? s.locating : s.useLocation}
        </Button>
        {value && !picking && (
          <Button type="button" variant="ghost" className="h-11" onClick={() => onChange(null)}>
            {s.remove}
          </Button>
        )}
      </div>
      {relocationWorkplace && !value && !picking && (
        <Button type="button" variant="link" className="h-auto min-h-11 px-0 text-left whitespace-normal" onClick={() => onChange(relocationWorkplace)}>
          {s.fromRequest}
        </Button>
      )}
      {locationError && (
        <p role="alert" className="text-sm text-destructive">
          {s.locationDenied}
        </p>
      )}
      <p className="text-xs text-muted-foreground">{s.privacy}</p>
    </fieldset>
  );
}
