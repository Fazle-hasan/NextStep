"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinPicker, type MapPoint } from "@/lib/maps";

import { placesAdminStrings } from "../strings";

const s = placesAdminStrings.form;

type Props = {
  lat: string;
  lng: string;
  onChange: (lat: string, lng: string) => void;
  // Where the map opens before a pin is set (area centre, else city centre).
  initialCenter?: MapPoint;
  error?: string;
};

function toPoint(lat: string, lng: string): MapPoint | null {
  const a = Number(lat);
  const b = Number(lng);
  if (lat.trim() === "" || lng.trim() === "" || !Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return { lat: a, lng: b };
}

// The required location: a map pin, with typed coordinates as the fallback when the map is unavailable.
export function PlaceLocationField({ lat, lng, onChange, initialCenter, error }: Props) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{s.location}</legend>
      <PinPicker
        value={toPoint(lat, lng)}
        onChange={(point) => onChange(String(point.lat), String(point.lng))}
        initialCenter={initialCenter}
        ariaLabel={s.mapLabel}
      />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="place-lat">{s.latitude}</Label>
          <Input
            id="place-lat"
            inputMode="decimal"
            className="h-11"
            value={lat}
            aria-invalid={Boolean(error)}
            onChange={(event) => onChange(event.target.value, lng)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="place-lng">{s.longitude}</Label>
          <Input
            id="place-lng"
            inputMode="decimal"
            className="h-11"
            value={lng}
            aria-invalid={Boolean(error)}
            onChange={(event) => onChange(lat, event.target.value)}
          />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{s.coordsHint}</p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
