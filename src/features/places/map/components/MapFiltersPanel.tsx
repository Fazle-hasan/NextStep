"use client";

import { SlidersHorizontal } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/features/profiles/components/Field";
import { NativeSelect } from "@/features/profiles/seeker/components/NativeSelect";
import { LISTING_TYPE_LABELS } from "@/features/settle-in/flats/labels";
import type { MapPoint } from "@/lib/maps";

import { PLACE_TYPE_LABELS } from "../../labels";
import {
  countActiveMapFilters,
  DEFAULT_PLACE_TYPES,
  LISTING_TYPES,
  MASJID_RADII,
  PLACE_TYPES,
  WORKPLACE_RADII,
  type MapFilters,
} from "../schemas";
import { mapPageStrings } from "../strings";
import type { MapCity } from "../types";

import { CheckList } from "./CheckList";
import { WorkplacePicker } from "./WorkplacePicker";

const s = mapPageStrings.filters;

type Props = {
  cities: MapCity[];
  // The filters currently applied (from the URL).
  filters: MapFilters;
  relocationWorkplace: MapPoint | null;
  pending: boolean;
  onApply: (filters: MapFilters) => void;
};

function rupees(text: string): number | null {
  const n = Number(text.replace(/[,\s]/g, ""));
  return text.trim() !== "" && Number.isInteger(n) && n >= 1 && n <= 2_000_000 ? n : null;
}

// Filters for the map. Collapsed behind a button on phones so the map stays visible.
// The parent remounts this (key) when the applied filters change, so the draft starts from them.
export function MapFiltersPanel({ cities, filters, relocationWorkplace, pending, onApply }: Props) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MapFilters>(filters);
  const [rentMin, setRentMin] = useState(filters.rentMin?.toString() ?? "");
  const [rentMax, setRentMax] = useState(filters.rentMax?.toString() ?? "");
  const cityCenter = cities.find((c) => c.id === draft.cityId)?.center ?? undefined;

  function apply(next: MapFilters) {
    onApply({ ...next, rentMin: rupees(rentMin), rentMax: rupees(rentMax), workKm: next.workplace ? next.workKm : null });
    setOpen(false);
  }

  function reset() {
    setRentMin("");
    setRentMax("");
    onApply({
      cityId: draft.cityId,
      masjidKm: null,
      workplace: null,
      workKm: null,
      rentMin: null,
      rentMax: null,
      listingTypes: [],
      placeTypes: DEFAULT_PLACE_TYPES,
    });
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full md:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <SlidersHorizontal aria-hidden="true" />
        {s.toggle(countActiveMapFilters(filters))}
        <span className="sr-only">{open ? s.hide : s.show}</span>
      </Button>

      <form
        id={panelId}
        className={open ? "space-y-5" : "hidden space-y-5 md:block"}
        onSubmit={(event) => {
          event.preventDefault();
          apply(draft);
        }}
      >
        <Field id="map-city" label={s.city}>
          <NativeSelect id="map-city" value={draft.cityId ?? ""} onChange={(e) => setDraft({ ...draft, cityId: e.target.value || null })}>
            <option value="">{s.allCities}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field id="map-masjid" label={s.masjid}>
          <NativeSelect
            id="map-masjid"
            value={draft.masjidKm?.toString() ?? ""}
            onChange={(e) => setDraft({ ...draft, masjidKm: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">{s.masjidOff}</option>
            {MASJID_RADII.map((km) => (
              <option key={km} value={km}>
                {s.masjidWithin(km)}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <WorkplacePicker
          value={draft.workplace}
          onChange={(workplace) => setDraft({ ...draft, workplace, workKm: workplace ? draft.workKm : null })}
          relocationWorkplace={relocationWorkplace}
          initialCenter={cityCenter}
        />

        <Field id="map-work-km" label={s.workplaceRadius} hint={draft.workplace ? undefined : s.workplaceRadiusHint}>
          <NativeSelect
            id="map-work-km"
            disabled={!draft.workplace}
            value={draft.workKm?.toString() ?? ""}
            onChange={(e) => setDraft({ ...draft, workKm: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">{s.workplaceOff}</option>
            {WORKPLACE_RADII.map((km) => (
              <option key={km} value={km}>
                {s.workplaceWithin(km)}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="map-rent-min" label={s.rentMin}>
            <Input id="map-rent-min" inputMode="numeric" className="h-11 text-base" value={rentMin} onChange={(e) => setRentMin(e.target.value)} />
          </Field>
          <Field id="map-rent-max" label={s.rentMax}>
            <Input id="map-rent-max" inputMode="numeric" className="h-11 text-base" value={rentMax} onChange={(e) => setRentMax(e.target.value)} />
          </Field>
        </div>

        <CheckList
          legend={s.listingTypes}
          options={LISTING_TYPES}
          labels={LISTING_TYPE_LABELS}
          selected={draft.listingTypes}
          onChange={(listingTypes) => setDraft({ ...draft, listingTypes })}
        />
        <CheckList
          legend={s.layers}
          options={PLACE_TYPES}
          labels={PLACE_TYPE_LABELS}
          selected={draft.placeTypes}
          onChange={(placeTypes) => setDraft({ ...draft, placeTypes })}
        />

        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="h-11 flex-1" disabled={pending}>
            {pending ? s.applying : s.apply}
          </Button>
          <Button type="button" variant="ghost" className="h-11" disabled={pending} onClick={reset}>
            {s.reset}
          </Button>
        </div>
      </form>
    </div>
  );
}
