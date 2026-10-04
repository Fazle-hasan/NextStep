"use client";

import { MapPin, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CityOption } from "@/features/profiles/queries";

import { addCompanyLocation, removeCompanyLocation } from "../actions";
import { MAX_LOCATIONS } from "../schemas";
import { employerStrings } from "../strings";
import type { CompanyLocation } from "../types";

const s = employerStrings.locations;

type Props = { companyId: string; locations: CompanyLocation[]; cities: CityOption[] };

export function LocationsEditor({ companyId, locations, cities }: Props) {
  const router = useRouter();
  const [cityId, setCityId] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const full = locations.length >= MAX_LOCATIONS;

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addCompanyLocation({ companyId, cityId, address });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCityId("");
      setAddress("");
      router.refresh();
    });
  }

  function remove(locationId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeCompanyLocation({ companyId, locationId });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {locations.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.empty}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {locations.map((location) => {
            const place = [location.address, location.cityName].filter(Boolean).join(", ");
            return (
              <li key={location.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="break-words">{place}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0"
                  aria-label={s.removeLabel(place)}
                  disabled={pending}
                  onClick={() => remove(location.id)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {full ? (
        <p className="text-sm text-muted-foreground">{s.limit}</p>
      ) : (
        <form onSubmit={add} className="grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="location-city">{s.city}</Label>
            <Select value={cityId || undefined} onValueChange={setCityId}>
              <SelectTrigger id="location-city" className="h-11 w-full text-base">
                <SelectValue placeholder={s.cityPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location-address">{s.address}</Label>
            <Input
              id="location-address"
              className="h-11 text-base"
              maxLength={300}
              autoComplete="street-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" className="h-11" disabled={pending || !cityId}>
            {pending ? s.adding : s.add}
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
