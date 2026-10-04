import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getViewer } from "@/features/auth/queries";
import { OnboardingWizard } from "@/features/profiles/components/OnboardingWizard";
import { getActiveCities, hasPhoneOnFile } from "@/features/profiles/queries";
import { safeNextPath } from "@/lib/utils/redirect";

export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in?next=/onboarding");

  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);
  const [cities, hasPhone] = await Promise.all([getActiveCities(), hasPhoneOnFile(viewer.id)]);
  const { profile } = viewer;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <OnboardingWizard
        cities={cities}
        defaults={{
          fullName: profile.full_name ?? "",
          // Unset until first onboarding; the schema rejects a missing value on submit.
          gender: profile.gender ?? undefined,
          cityId: profile.city_id ?? "",
          phone: "",
          intents: profile.intents,
          verificationNote: "",
        }}
        genderLocked={profile.gender != null}
        needsPhone={!hasPhone}
        isUpdate={profile.onboarding_completed_at != null}
        next={next}
      />
    </main>
  );
}
