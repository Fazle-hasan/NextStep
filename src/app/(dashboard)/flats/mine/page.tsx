import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireViewer } from "@/features/auth/queries";
import { EmptyState } from "@/features/jobs/search/components/EmptyState";
import { BackLink } from "@/features/settle-in/flats/components/BackLink";
import { ListerBadgeCard } from "@/features/settle-in/flats/components/ListerBadgeCard";
import { MyListingCard } from "@/features/settle-in/flats/components/MyListingCard";
import { getListerBadgeStatus, getMyListings } from "@/features/settle-in/flats/queries";
import { flatsStrings } from "@/features/settle-in/flats/strings";

const s = flatsStrings.manage;

export const metadata: Metadata = { title: s.title };

export default async function MyListingsPage() {
  const viewer = await requireViewer("/flats/mine");
  const [listings, badge] = await Promise.all([getMyListings(viewer.id), getListerBadgeStatus(viewer.id)]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <BackLink href="/flats" label={flatsStrings.detail.back} />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{s.title}</h1>
          <p className="text-muted-foreground">{s.intro}</p>
        </div>
        <Button asChild className="h-11">
          <Link href="/flats/new">{flatsStrings.search.listYours}</Link>
        </Button>
      </header>

      {/* Only listers can ask for the badge (the database checks the role too). */}
      {(listings.length > 0 || badge !== "none") && <ListerBadgeCard status={badge} />}

      {listings.length === 0 ? (
        <EmptyState title={s.emptyTitle} body={s.emptyBody} />
      ) : (
        <ul className="space-y-4">
          {listings.map((item) => (
            <li key={item.listing.id}>
              <MyListingCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
