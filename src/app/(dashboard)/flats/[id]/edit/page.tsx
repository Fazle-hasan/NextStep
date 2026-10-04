import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { getNeighbourhoods } from "@/features/jobs/queries";
import { getActiveCities } from "@/features/profiles/queries";
import { AddressForm } from "@/features/settle-in/flats/components/AddressForm";
import { BackLink } from "@/features/settle-in/flats/components/BackLink";
import { ListingActions } from "@/features/settle-in/flats/components/ListingActions";
import { ListingForm } from "@/features/settle-in/flats/components/ListingForm";
import { PhotoManager } from "@/features/settle-in/flats/components/PhotoManager";
import { listingDefaults } from "@/features/settle-in/flats/defaults";
import { LISTING_STATUS_LABELS } from "@/features/settle-in/flats/labels";
import { getListingForEdit } from "@/features/settle-in/flats/queries";
import { flatsStrings } from "@/features/settle-in/flats/strings";

const s = flatsStrings;

export const metadata: Metadata = { title: s.form.editTitle };

export default async function EditFlatPage({ params }: PageProps<"/flats/[id]/edit">) {
  const { id } = await params;
  const viewer = await requireViewer(`/flats/${id}/edit`);
  if (!z.uuid().safeParse(id).success) notFound();

  const data = await getListingForEdit(viewer.id, id);
  if (!data) notFound();
  const { listing, photos, address } = data;
  const [cities, neighbourhoods] = await Promise.all([getActiveCities(), getNeighbourhoods()]);

  const expired = new Date(listing.expires_at) <= new Date();
  const shownStatus = listing.status === "active" && expired ? "expired" : listing.status;
  const unpublished = listing.status === "paused" && !expired;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BackLink href="/flats/mine" label={s.manage.back} />
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{s.form.editTitle}</h1>
          <Badge variant={shownStatus === "active" ? "default" : "secondary"}>{LISTING_STATUS_LABELS[shownStatus]}</Badge>
        </div>
        <Button asChild variant="outline" className="h-11">
          <Link href={`/flats/${listing.id}`}>{s.manage.view}</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            <h2>{s.manage.publishTitle}</h2>
          </CardTitle>
          {unpublished && <CardDescription>{s.manage.publishIntro}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ListingActions
            listingId={listing.id}
            status={listing.status}
            expired={expired}
            hasAddress={Boolean(address)}
            afterDelete="/flats/mine"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            <h2>{s.address.title}</h2>
          </CardTitle>
          <CardDescription>{s.address.intro}</CardDescription>
        </CardHeader>
        <CardContent>
          <AddressForm
            listingId={listing.id}
            defaults={{ addressLine: address?.addressLine ?? "", landmark: address?.landmark ?? "" }}
            hasSavedPin={Boolean(address)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            <h2>{s.photos.title}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PhotoManager listingId={listing.id} initialPhotos={photos} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            <h2>{s.detail.details}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ListingForm listingId={listing.id} defaults={listingDefaults(listing)} cities={cities} neighbourhoods={neighbourhoods} />
        </CardContent>
      </Card>
    </div>
  );
}
