import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { getNeighbourhoods } from "@/features/jobs/queries";
import { getActiveCities } from "@/features/profiles/queries";
import { BackLink } from "@/features/settle-in/flats/components/BackLink";
import { ListingForm } from "@/features/settle-in/flats/components/ListingForm";
import { listingDefaults } from "@/features/settle-in/flats/defaults";
import { flatsStrings } from "@/features/settle-in/flats/strings";

const s = flatsStrings.form;

export const metadata: Metadata = { title: s.newTitle };

export default async function NewFlatPage() {
  const viewer = await requireViewer("/flats/new");
  const [cities, neighbourhoods] = await Promise.all([getActiveCities(), getNeighbourhoods()]);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BackLink href="/flats/mine" label={flatsStrings.manage.back} />
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <h1>{s.newTitle}</h1>
          </CardTitle>
          <CardDescription>{s.newIntro}</CardDescription>
        </CardHeader>
        <CardContent>
          <ListingForm
            defaults={listingDefaults(undefined, viewer.profile.city_id)}
            cities={cities}
            neighbourhoods={neighbourhoods}
          />
        </CardContent>
      </Card>
    </div>
  );
}
