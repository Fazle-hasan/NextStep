import { Home } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listingPhotoUrl } from "@/lib/supabase/storage";
import { formatDate } from "@/lib/utils/dates";
import { formatMonthlyRent } from "@/lib/utils/money";

import { LISTING_STATUS_LABELS, LISTING_TYPE_LABELS } from "../labels";
import { flatsStrings } from "../strings";
import type { MyListing } from "../types";

import { IncomingRequestItem } from "./IncomingRequestItem";
import { ListingActions } from "./ListingActions";

const s = flatsStrings.manage;

// One of the lister's own listings: status, expiry, actions and incoming contact requests.
export function MyListingCard({ item }: { item: MyListing }) {
  const { listing, requests, expired } = item;
  const photo = listingPhotoUrl(item.coverPhotoPath);
  const shownStatus = listing.status === "active" && expired ? "expired" : listing.status;
  const place = [item.neighbourhoodName, item.cityName].filter(Boolean).join(", ");
  const headingId = `listing-${listing.id}`;

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- listing photo served from Supabase Storage
              <img src={photo} alt="" loading="lazy" className="size-full object-cover" />
            ) : (
              <Home className="size-7 text-muted-foreground" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <h2 id={headingId} className="text-base leading-snug font-semibold">
              <Link href={`/flats/${listing.id}`} className="hover:underline focus-visible:underline">
                {listing.title}
              </Link>
            </h2>
            <p className="text-sm text-muted-foreground">
              {[LISTING_TYPE_LABELS[listing.listing_type], place, formatMonthlyRent(listing.rent)].filter(Boolean).join(" · ")}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant={shownStatus === "active" ? "default" : "secondary"}>{LISTING_STATUS_LABELS[shownStatus]}</Badge>
              {listing.status !== "rented" && (
                <span>{expired ? s.expiredOn(formatDate(listing.expires_at)) : s.expiresIn(item.daysLeft)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-2">
          <Button asChild variant="outline" className="h-11">
            <Link href={`/flats/${listing.id}/edit`}>{s.edit}</Link>
          </Button>
          <ListingActions listingId={listing.id} status={listing.status} expired={expired} hasAddress={item.hasAddress} />
        </div>

        <section aria-label={`${s.requestsTitle}: ${listing.title}`} className="space-y-2 border-t pt-3">
          <h3 className="text-sm font-medium">{s.requestsTitle}</h3>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">{s.noRequests}</p>
          ) : (
            <ul className="space-y-2">
              {requests.map((request) => (
                <IncomingRequestItem key={request.id} request={request} />
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
