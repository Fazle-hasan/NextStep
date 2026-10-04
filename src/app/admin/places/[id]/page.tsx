import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PlaceForm } from "@/features/places/admin/components/PlaceForm";
import { PlacePhotoManager } from "@/features/places/admin/components/PlacePhotoManager";
import { getAdminPlace, getAreaCentres } from "@/features/places/admin/queries";
import type { PlaceFormInput } from "@/features/places/admin/schemas";
import { placesAdminStrings as s } from "@/features/places/admin/strings";
import type { AdminPlaceDetail } from "@/features/places/admin/types";

async function loadPlace(id: string): Promise<AdminPlaceDetail | null> {
  if (!z.guid().safeParse(id).success) return null;
  return getAdminPlace(id);
}

export async function generateMetadata({ params }: PageProps<"/admin/places/[id]">): Promise<Metadata> {
  const { id } = await params;
  const place = await loadPlace(id);
  return { title: place ? `${s.form.editTitle}: ${place.name}` : s.pages.placeNotFoundTitle };
}

function toFormInput(place: AdminPlaceDetail): PlaceFormInput {
  return {
    id: place.id,
    name: place.name,
    placeType: place.placeType,
    cityId: place.cityId,
    neighbourhoodId: place.neighbourhoodId ?? "",
    address: place.address ?? "",
    phone: place.phone ?? "",
    website: place.website ?? "",
    timings: place.timings ?? "",
    notes: place.notes ?? "",
    isVerified: place.isVerified,
    lat: place.location ? String(place.location.lat) : "",
    lng: place.location ? String(place.location.lng) : "",
  };
}

export default async function AdminEditPlacePage({ params }: PageProps<"/admin/places/[id]">) {
  const { id } = await params;
  const [place, { cities, areas }] = await Promise.all([loadPlace(id), getAreaCentres()]);
  if (!place) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Link href="/admin/places" className="text-sm text-primary hover:underline">
          ← {s.pages.backToPlaces}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{place.name}</h1>
          {place.isVerified && !place.isHidden && (
            <Button asChild variant="outline" className="h-11">
              <Link href={`/places/${place.id}`}>{s.form.viewPublic}</Link>
            </Button>
          )}
        </div>
      </div>

      {place.isHidden && (
        <Alert>
          <AlertDescription>{s.pages.hiddenNotice}</AlertDescription>
        </Alert>
      )}
      {!place.isVerified && !place.isHidden && (
        <Alert>
          <AlertDescription>{s.pages.unverifiedNotice}</AlertDescription>
        </Alert>
      )}

      <PlaceForm initial={toFormInput(place)} cities={cities} areas={areas} />

      <PlacePhotoManager placeId={place.id} placeName={place.name} photos={place.photos} />
    </div>
  );
}
