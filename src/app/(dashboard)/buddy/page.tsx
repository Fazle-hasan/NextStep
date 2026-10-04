import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { BuddyProfileForm } from "@/features/settle-in/buddy/components/BuddyProfileForm";
import { MyOfferItem } from "@/features/settle-in/buddy/components/MyOfferItem";
import { OpenRequestCard } from "@/features/settle-in/buddy/components/OpenRequestCard";
import { VerificationBanner } from "@/features/settle-in/buddy/components/VerificationBanner";
import { getBuddyProfile, getMyOffers, getOpenRequestsForBuddy } from "@/features/settle-in/buddy/queries";
import type { BuddyProfileValues } from "@/features/settle-in/buddy/schemas";
import { buddyStrings as s } from "@/features/settle-in/buddy/strings";
import type { BuddyProfile } from "@/features/settle-in/buddy/types";
import { getCities, getNeighbourhoods } from "@/features/settle-in/relocation/queries";

export const metadata: Metadata = { title: "Buddy dashboard" };

function formDefaults(profile: BuddyProfile | null, cityId: string | null): BuddyProfileValues {
  return {
    cityId: profile?.cityId ?? cityId ?? "",
    neighbourhoodIds: profile?.neighbourhoodIds ?? [],
    bio: profile?.bio ?? "",
    languages: profile?.languages.join(", ") ?? "",
    helpTypes: profile?.helpTypes ?? ["general_advice"],
    isActive: profile?.isActive ?? true,
  };
}

export default async function BuddyPage() {
  const viewer = await requireViewer("/buddy");
  const [profile, cities, neighbourhoods] = await Promise.all([getBuddyProfile(viewer.id), getCities(), getNeighbourhoods()]);

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{s.create.title}</h1>
          <p className="text-muted-foreground">{s.create.body}</p>
        </div>
        <BuddyProfileForm isNew defaults={formDefaults(null, viewer.profile.city_id)} cities={cities} neighbourhoods={neighbourhoods} />
      </div>
    );
  }

  const isVerified = profile.verificationStatus === "approved";
  const [requests, offers] = await Promise.all([
    isVerified && profile.isActive ? getOpenRequestsForBuddy(viewer.id) : Promise.resolve([]),
    getMyOffers(viewer.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="text-muted-foreground">{s.intro}</p>
      </div>

      <VerificationBanner status={profile.verificationStatus} rejectionReason={profile.rejectionReason} isActive={profile.isActive} />

      <section className="space-y-3" aria-labelledby="open-requests">
        <h2 id="open-requests" className="text-lg font-semibold">
          {s.requests.title}
        </h2>
        {requests.length === 0 ? (
          <Card>
            <CardContent className="space-y-1 text-center">
              {isVerified ? (
                <>
                  <h3 className="text-base font-semibold">{s.requests.emptyTitle}</h3>
                  <p className="text-sm text-muted-foreground">{s.requests.emptyBody}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{s.requests.notVerified}</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => (
              <li key={request.id}>
                <OpenRequestCard request={request} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="my-offers">
        <h2 id="my-offers" className="text-lg font-semibold">
          {s.offers.title}
        </h2>
        {offers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{s.offers.empty}</p>
        ) : (
          <ul className="space-y-3">
            {offers.map((offer) => (
              <li key={offer.id}>
                <MyOfferItem offer={offer} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="rounded-xl border p-4">
        <summary className="min-h-11 cursor-pointer content-center text-base font-semibold">
          {s.profile.title}
          {profile.ratingAvg !== null && profile.ratingCount > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {s.profile.rating(profile.ratingAvg.toFixed(1), profile.ratingCount)}
            </span>
          )}
        </summary>
        <div className="pt-4">
          <BuddyProfileForm isNew={false} defaults={formDefaults(profile, null)} cities={cities} neighbourhoods={neighbourhoods} />
        </div>
      </details>
    </div>
  );
}
