import { BadgeCheck, Clock, Globe, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { PageFrame } from "@/features/jobs/search/components/PageFrame";
import { getPublicPageViewer } from "@/features/jobs/search/viewer";
import { NearbyPlaces } from "@/features/places/directory/components/NearbyPlaces";
import { PlacePhotos } from "@/features/places/directory/components/PlacePhotos";
import { PlaceTypeBadge } from "@/features/places/directory/components/PlaceTypeBadge";
import { getNearbyPlaces, getPlace } from "@/features/places/directory/queries";
import { placesStrings } from "@/features/places/directory/strings";
import { placeMarkerKind } from "@/features/places/labels";
import { BackLink } from "@/features/settle-in/flats/components/BackLink";
import { MapView } from "@/lib/maps";

const s = placesStrings.detail;
const uuid = z.guid();

export async function generateMetadata({ params }: PageProps<"/places/[id]">): Promise<Metadata> {
  const { id } = await params;
  const place = uuid.safeParse(id).success ? await getPlace(id) : null;
  return { title: place ? place.name : s.notFoundTitle };
}

export default async function PlacePage({ params }: PageProps<"/places/[id]">) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();

  const [place, { viewer, inShell }] = await Promise.all([getPlace(id), getPublicPageViewer()]);
  if (!place) notFound();

  const nearby = place.point ? await getNearbyPlaces(place.point, place.id) : [];
  const where = [place.areaName, place.cityName].filter(Boolean).join(", ");
  const suggestHref = `/places/suggest?place=${place.id}`;

  return (
    <PageFrame inShell={inShell} className="max-w-3xl space-y-6">
      <BackLink href="/places" label={s.back} />

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <PlaceTypeBadge type={place.placeType} />
          {place.isVerified && (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
              <BadgeCheck className="size-4" aria-hidden="true" />
              {placesStrings.verified}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight break-words">{place.name}</h1>
        {where && <p className="text-muted-foreground">{where}</p>}
      </header>

      <PlacePhotos name={place.name} paths={place.photoPaths} />

      <dl className="space-y-4">
        {place.address && (
          <div className="flex gap-3">
            <MapPin className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-sm font-medium">{s.address}</dt>
              <dd className="break-words">{place.address}</dd>
            </div>
          </div>
        )}
        {place.timings && (
          <div className="flex gap-3">
            <Clock className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-sm font-medium">{s.timings}</dt>
              <dd className="break-words whitespace-pre-line">{place.timings}</dd>
            </div>
          </div>
        )}
        {place.phone && (
          <div className="flex gap-3">
            <Phone className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-sm font-medium">{s.phone}</dt>
              <dd>
                <a href={`tel:${place.phone.replace(/[^0-9+]/g, "")}`} className="underline underline-offset-4">
                  {place.phone}
                </a>
              </dd>
            </div>
          </div>
        )}
        {place.website && (
          <div className="flex gap-3">
            <Globe className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <dt className="text-sm font-medium">{s.website}</dt>
              <dd className="break-all">
                <a href={place.website} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-4">
                  {place.website}
                </a>
              </dd>
            </div>
          </div>
        )}
      </dl>

      {place.notes && (
        <section aria-labelledby="place-notes" className="space-y-2">
          <h2 id="place-notes" className="text-lg font-semibold">
            {s.notes}
          </h2>
          <p className="break-words whitespace-pre-line">{place.notes}</p>
        </section>
      )}

      {place.point && (
        <section aria-labelledby="place-map" className="space-y-2">
          <h2 id="place-map" className="text-lg font-semibold">
            {s.map}
          </h2>
          <MapView
            markers={[{ id: place.id, kind: placeMarkerKind(place.placeType), label: place.name, ...place.point }]}
            center={place.point}
            zoom={15}
            ariaLabel={s.mapLabel(place.name)}
            className="h-64"
          />
        </section>
      )}

      {place.point && <NearbyPlaces places={nearby} />}

      <div className="flex flex-wrap gap-3 border-t pt-4">
        {place.areaName && place.areaSlug && place.citySlug && (
          <Button asChild variant="outline" className="h-11">
            <Link href={`/areas/${place.citySlug}/${place.areaSlug}`}>{s.areaGuide(place.areaName)}</Link>
          </Button>
        )}
        <Button asChild variant="outline" className="h-11">
          <Link href={viewer ? suggestHref : `/sign-in?next=${encodeURIComponent(suggestHref)}`}>
            {viewer ? s.correction : s.correctionSignIn}
          </Link>
        </Button>
      </div>
    </PageFrame>
  );
}
