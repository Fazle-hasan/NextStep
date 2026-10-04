import type { Metadata } from "next";
import { z } from "zod";

import { requireViewer } from "@/features/auth/queries";
import { MySuggestions } from "@/features/places/directory/components/MySuggestions";
import { SuggestionForm } from "@/features/places/directory/components/SuggestionForm";
import { getAreaOptions, getCityCentres, getMySuggestions, getPlace } from "@/features/places/directory/queries";
import { EMPTY_SUGGESTION, type SuggestionInput } from "@/features/places/directory/schemas";
import { placesStrings } from "@/features/places/directory/strings";
import { BackLink } from "@/features/settle-in/flats/components/BackLink";

const s = placesStrings.suggestForm;

export const metadata: Metadata = { title: s.newTitle };

// Suggest a new place, or (with ?place={id}) a correction to an existing one. Signed-in members only.
export default async function SuggestPlacePage({ searchParams }: PageProps<"/places/suggest">) {
  const raw = (await searchParams).place;
  const placeParam = Array.isArray(raw) ? raw[0] : raw;
  const placeId = z.guid().safeParse(placeParam).success ? (placeParam as string) : null;

  const viewer = await requireViewer(placeId ? `/places/suggest?place=${placeId}` : "/places/suggest");
  const [cities, areas, suggestions, place] = await Promise.all([
    getCityCentres(),
    getAreaOptions(),
    getMySuggestions(viewer.id),
    placeId ? getPlace(placeId) : null,
  ]);

  // A correction starts from the current values; a new place starts in the member's own city.
  const defaults: SuggestionInput = place
    ? {
        placeId: place.id,
        name: place.name,
        placeType: place.placeType,
        cityId: place.cityId,
        neighbourhoodId: place.neighbourhoodId ?? "",
        address: place.address ?? "",
        timings: place.timings ?? "",
        phone: place.phone ?? "",
        website: place.website ?? "",
        notes: place.notes ?? "",
        location: place.point,
        note: "",
      }
    : {
        ...EMPTY_SUGGESTION,
        cityId: cities.some((city) => city.id === viewer.profile.city_id) ? (viewer.profile.city_id ?? "") : "",
      };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div className="space-y-3">
        <BackLink href={place ? `/places/${place.id}` : "/places"} label={placesStrings.detail.back} />
        <h1 className="text-2xl font-bold tracking-tight">{place ? s.correctionTitle : s.newTitle}</h1>
        <p className="text-muted-foreground">{place ? s.correctionIntro(place.name) : s.newIntro}</p>
      </div>

      <SuggestionForm
        key={place?.id ?? "new"}
        defaults={defaults}
        cities={cities}
        areas={areas}
        cancelHref={place ? `/places/${place.id}` : "/places"}
      />

      <MySuggestions suggestions={suggestions} />
    </div>
  );
}
