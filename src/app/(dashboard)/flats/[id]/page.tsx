import { ArrowLeft, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { BlockButton } from "@/features/safety/components/BlockButton";
import { ReportDialog } from "@/features/safety/components/ReportDialog";
import { ContactPanel } from "@/features/settle-in/flats/components/ContactPanel";
import { ListingFacts } from "@/features/settle-in/flats/components/ListingFacts";
import { PhotoGallery } from "@/features/settle-in/flats/components/PhotoGallery";
import { LISTING_STATUS_LABELS, LISTING_TYPE_LABELS } from "@/features/settle-in/flats/labels";
import { getFlatDetail } from "@/features/settle-in/flats/queries";
import { flatsStrings } from "@/features/settle-in/flats/strings";
import { isMapConfigured, MapView, parseEwkbPoint } from "@/lib/maps";
import { formatMonthlyRent } from "@/lib/utils/money";

const s = flatsStrings.detail;

export const metadata: Metadata = { title: flatsStrings.search.title };

export default async function FlatPage({ params }: PageProps<"/flats/[id]">) {
  const { id } = await params;
  const viewer = await requireViewer(`/flats/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();

  const detail = await getFlatDetail(viewer.id, id);
  if (!detail) notFound();
  const { listing, photos, isOwner, myRequest, address } = detail;

  const place = [detail.neighbourhoodName, detail.cityName].filter(Boolean).join(", ");
  const isLive = listing.status === "active" && new Date(listing.expires_at) > new Date();
  // The exact pin only for viewers who already get the exact address (the lister or an accepted requester);
  // everyone else sees the approximate public point (D-004).
  const approxPoint = typeof listing.approx_location === "string" ? parseEwkbPoint(listing.approx_location) : null;
  const mapPoint = isMapConfigured() ? (address ? { lat: address.lat, lng: address.lng } : approxPoint) : null;
  const statusNote = isLive ? "" : s.statusNote[listing.status === "active" ? "expired" : listing.status];

  return (
    <article className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        href="/flats"
        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {s.back}
      </Link>

      <PhotoGallery title={listing.title} photos={photos} />

      <header className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">{LISTING_TYPE_LABELS[listing.listing_type]}</Badge>
          {!isLive && (
            <StatusBadge
              tone="inactive"
              label={LISTING_STATUS_LABELS[listing.status === "active" ? "expired" : listing.status]}
            />
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{listing.title}</h1>
        <p className="text-xl font-semibold">{formatMonthlyRent(listing.rent)}</p>
        {place && (
          <p className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            {place}
          </p>
        )}
        {statusNote && (
          <p role="status" className="text-sm text-muted-foreground">
            {statusNote}
          </p>
        )}
      </header>

      {isOwner && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">{s.ownListing}</p>
          <Button asChild className="h-11">
            <Link href={`/flats/${listing.id}/edit`}>{s.manage}</Link>
          </Button>
        </div>
      )}

      {listing.description && (
        <section aria-labelledby="about-heading" className="space-y-2">
          <h2 id="about-heading" className="text-lg font-semibold">
            {s.about}
          </h2>
          <p className="whitespace-pre-line break-words">{listing.description}</p>
        </section>
      )}

      <ListingFacts listing={listing} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            <h2>{address ? s.addressTitle : s.areaTitle}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {address ? (
            <>
              <p className="text-sm text-muted-foreground">{isOwner ? s.addressOwn : s.addressShared}</p>
              <address className="not-italic">
                <p className="font-medium break-words">{address.addressLine}</p>
                {address.landmark && (
                  <p className="text-sm text-muted-foreground">
                    {s.landmark}: {address.landmark}
                  </p>
                )}
              </address>
            </>
          ) : (
            <>
              {place && <p className="font-medium">{place}</p>}
              <p className="text-sm text-muted-foreground">{s.areaBody}</p>
            </>
          )}
          {mapPoint && (
            <>
              <MapView
                markers={[
                  {
                    id: listing.id,
                    kind: "flat",
                    lat: mapPoint.lat,
                    lng: mapPoint.lng,
                    label: address ? s.mapExact : s.mapApprox,
                  },
                ]}
                center={mapPoint}
                zoom={address ? 15 : 13}
                ariaLabel={address ? s.mapExact : s.mapApprox}
                className="h-56"
              />
              {!address && <p className="text-sm text-muted-foreground">{s.mapApproxNote}</p>}
            </>
          )}
        </CardContent>
      </Card>

      {!isOwner && (
        <>
          <ContactPanel listingId={listing.id} myRequest={myRequest} open={isLive} />
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {s.listedBy} <span className="font-medium text-foreground">{detail.listerName ?? flatsStrings.manage.someone}</span>
              {detail.listerVerified && (
                <StatusBadge tone="success" label={flatsStrings.listerBadge.verified} className="ml-2" />
              )}
            </p>
            <div className="flex flex-wrap gap-1">
              <ReportDialog targetType="flat_listing" targetId={listing.id} />
              <BlockButton userId={listing.lister_id} />
            </div>
          </footer>
        </>
      )}
    </article>
  );
}
