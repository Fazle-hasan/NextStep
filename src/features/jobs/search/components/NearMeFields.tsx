"use client";

import { LocateFixed } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { RADIUS_OPTIONS } from "../schemas";
import { searchStrings as s } from "../strings";

type Props = { lat?: number; lng?: number; radius?: number };

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// "Near me" filter: asks the browser for a location and submits it with the search form.
// The point is only used for this search; it is not stored on the profile.
export function NearMeFields({ lat, lng, radius }: Props) {
  const rootRef = useRef<HTMLFieldSetElement>(null);
  const [point, setPoint] = useState(lat !== undefined && lng !== undefined ? { lat, lng } : null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submitForm() {
    // Wait for the hidden inputs to render with the new values.
    requestAnimationFrame(() => rootRef.current?.closest("form")?.requestSubmit());
  }

  function locate() {
    setError(null);
    if (!("geolocation" in navigator)) {
      setError(s.nearMe.unsupported);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        // Round to ~100 m: enough for a distance filter, and keeps precise coordinates out of URLs.
        setPoint({
          lat: Math.round(position.coords.latitude * 1000) / 1000,
          lng: Math.round(position.coords.longitude * 1000) / 1000,
        });
        submitForm();
      },
      (geoError) => {
        setLocating(false);
        setError(geoError.code === geoError.PERMISSION_DENIED ? s.nearMe.denied : s.nearMe.unavailable);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  return (
    <fieldset ref={rootRef} className="space-y-2">
      <legend className="mb-2 text-sm font-medium">{s.nearMe.legend}</legend>
      {point ? (
        <>
          <input type="hidden" name="lat" value={point.lat} />
          <input type="hidden" name="lng" value={point.lng} />
          <p className="text-sm text-muted-foreground">{s.nearMe.active}</p>
          <label htmlFor="radius" className="text-sm">
            {s.nearMe.radius}
          </label>
          <select id="radius" name="radius" defaultValue={String(radius ?? 10)} className={selectClass}>
            {RADIUS_OPTIONS.map((km) => (
              <option key={km} value={km}>
                {s.nearMe.km(km)}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="link"
            className="h-11 px-0"
            onClick={() => {
              setPoint(null);
              submitForm();
            }}
          >
            {s.nearMe.remove}
          </Button>
        </>
      ) : (
        <Button type="button" variant="outline" className="h-11 w-full" disabled={locating} onClick={locate}>
          <LocateFixed aria-hidden="true" />
          {locating ? s.nearMe.locating : s.nearMe.use}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
