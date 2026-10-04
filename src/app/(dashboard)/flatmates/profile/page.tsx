import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { getActiveCities } from "@/features/profiles/queries";
import { DeleteProfileButton } from "@/features/settle-in/flatmates/components/DeleteProfileButton";
import { FlatmateProfileForm } from "@/features/settle-in/flatmates/components/FlatmateProfileForm";
import { profileFormDefaults } from "@/features/settle-in/flatmates/defaults";
import { GENDER_LABELS } from "@/features/settle-in/flatmates/labels";
import { getMyFlatmateProfile, getNeighbourhoodOptions } from "@/features/settle-in/flatmates/queries";
import { flatmateStrings as s } from "@/features/settle-in/flatmates/strings";

export const metadata: Metadata = { title: s.profile.editTitle };

export default async function FlatmateProfilePage() {
  const viewer = await requireViewer("/flatmates/profile");
  const [profile, cities, neighbourhoods] = await Promise.all([
    getMyFlatmateProfile(viewer.id),
    getActiveCities(),
    getNeighbourhoodOptions(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <Link href="/flatmates" className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:underline">
          ← {s.back}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{profile ? s.profile.editTitle : s.profile.createTitle}</h1>
        <p className="text-muted-foreground">{s.profile.intro}</p>
        <p className="text-sm text-muted-foreground">{s.strictFilters}</p>
      </header>

      <Card>
        <CardContent>
          <FlatmateProfileForm
            defaults={profileFormDefaults(profile, viewer.profile.city_id)}
            cities={cities}
            neighbourhoods={neighbourhoods}
            genderLabel={viewer.profile.gender ? GENDER_LABELS[viewer.profile.gender] : null}
          />
        </CardContent>
      </Card>

      {profile && <DeleteProfileButton />}
    </div>
  );
}
