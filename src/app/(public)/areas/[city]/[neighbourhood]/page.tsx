import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageFrame } from "@/features/jobs/search/components/PageFrame";
import { getPublicPageViewer } from "@/features/jobs/search/viewer";
import { AreaMap } from "@/features/places/areas/components/AreaMap";
import { GuideSection } from "@/features/places/areas/components/GuideSection";
import { NearbyPlaceList } from "@/features/places/areas/components/NearbyPlaceList";
import { RentRanges } from "@/features/places/areas/components/RentRanges";
import { TipsSection } from "@/features/places/areas/components/TipsSection";
import { canPostAreaTip, getArea, getAreaGuide, getAreaTips, getNearbyPlaces } from "@/features/places/areas/queries";
import { slugSchema } from "@/features/places/areas/schemas";
import { areaStrings as s } from "@/features/places/areas/strings";
import { PLACE_TYPE_LABELS, placeMarkerKind, WORSHIP_PLACE_TYPES, type PlaceType } from "@/features/places/labels";
import type { MapMarker } from "@/lib/maps";
import { formatDate } from "@/lib/utils/dates";

const OTHER_PLACE_TYPES: PlaceType[] = ["halal_restaurant", "halal_grocery", "hospital_clinic", "transit_station", "community_center", "islamic_school"];

type Params = PageProps<"/areas/[city]/[neighbourhood]">;

async function loadArea(params: Params["params"]) {
  const { city, neighbourhood } = await params;
  if (!slugSchema.safeParse(city).success || !slugSchema.safeParse(neighbourhood).success) return null;
  return getArea(city, neighbourhood);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const area = await loadArea(params);
  return { title: area ? `${area.name}, ${area.city.name}` : s.guide.notFoundTitle };
}

export default async function AreaGuidePage({ params }: Params) {
  const area = await loadArea(params);
  if (!area) notFound();

  const { viewer, inShell } = await getPublicPageViewer();
  const [guide, tips, canPost, worship, others] = await Promise.all([
    getAreaGuide(area.id),
    getAreaTips(area.id, viewer?.id ?? null),
    viewer ? canPostAreaTip() : false,
    area.center ? getNearbyPlaces(area.center, WORSHIP_PLACE_TYPES, 10) : [],
    area.center ? getNearbyPlaces(area.center, OTHER_PLACE_TYPES, 15) : [],
  ]);

  const path = `/areas/${area.city.slug}/${area.slug}`;
  const markers: MapMarker[] = [...worship, ...others].map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    kind: placeMarkerKind(p.placeType),
    label: `${p.name} (${PLACE_TYPE_LABELS[p.placeType]})`,
  }));

  return (
    <PageFrame inShell={inShell} className="max-w-3xl space-y-8">
      <div className="space-y-3">
        <Link href="/areas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft aria-hidden="true" className="size-4" />
          {s.guide.backToAreas}
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{area.name}</h1>
          <p className="text-muted-foreground">
            {area.city.name}
            {guide && ` · ${s.guide.updated(formatDate(guide.updatedAt))}`}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="h-11">
            <Link href={viewer ? `/flats?city=${area.city.id}` : `/sign-in?next=${encodeURIComponent(`/flats?city=${area.city.id}`)}`}>
              {viewer ? s.guide.findFlats : s.guide.signInForFlats}
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <Link href="/map">{s.guide.seeOnMap}</Link>
          </Button>
        </div>
      </div>

      {guide ? (
        <>
          <GuideSection id="area-about" title={s.guide.about} text={guide.summary} />
          <RentRanges ranges={guide.rentRanges} />
          <GuideSection id="area-commute" title={s.guide.commute} text={guide.commuteNotes} />
          <GuideSection id="area-safety" title={s.guide.safety} text={guide.safetyNotes} />
          <GuideSection id="area-halal-food" title={s.guide.halalFood} text={guide.halalFoodNotes} />
        </>
      ) : (
        <Alert>
          <AlertTitle>{s.guide.noGuideTitle}</AlertTitle>
          <AlertDescription>{s.guide.noGuideBody}</AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="area-worship" className="space-y-3">
        <h2 id="area-worship" className="text-lg font-semibold">
          {s.guide.worship}
        </h2>
        {area.center ? (
          <>
            <AreaMap center={area.center} markers={markers} ariaLabel={s.guide.mapLabel(area.name)} />
            <NearbyPlaceList places={worship} emptyText={s.guide.worshipEmpty} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{s.guide.noCentre}</p>
        )}
      </section>

      {area.center && (
        <section aria-labelledby="area-other-places" className="space-y-3">
          <h2 id="area-other-places" className="text-lg font-semibold">
            {s.guide.otherPlaces}
          </h2>
          <NearbyPlaceList places={others} emptyText={s.guide.otherPlacesEmpty} />
          <Link href="/places" className="inline-block text-sm font-medium underline underline-offset-4">
            {s.guide.allPlaces}
          </Link>
        </section>
      )}

      <TipsSection neighbourhoodId={area.id} tips={tips} signedIn={viewer !== null} canPost={canPost} returnPath={path} />
    </PageFrame>
  );
}
