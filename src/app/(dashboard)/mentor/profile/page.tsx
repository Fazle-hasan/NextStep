import type { Metadata } from "next";
import Link from "next/link";

import { requireViewer } from "@/features/auth/queries";
import { getSkills } from "@/features/jobs/queries";
import { MentorProfileForm } from "@/features/mentorship/mentor/components/MentorProfileForm";
import { getMentorProfile, getTimeZoneOptions } from "@/features/mentorship/mentor/queries";
import { DURATIONS, type MentorProfileValues } from "@/features/mentorship/mentor/schemas";
import { mentorStrings as s } from "@/features/mentorship/mentor/strings";
import type { MentorProfile } from "@/features/mentorship/mentor/types";
import { getCities } from "@/features/settle-in/relocation/queries";

export const metadata: Metadata = { title: "Mentor profile" };

function formDefaults(profile: MentorProfile | null, cityId: string | null): MentorProfileValues {
  const duration = String(profile?.defaultDurationMin ?? 30);
  return {
    headline: profile?.headline ?? "",
    bio: profile?.bio ?? "",
    industries: profile?.industries.join(", ") ?? "",
    yearsExperience: profile ? String(profile.yearsExperience) : "",
    languages: profile?.languages.join(", ") ?? "",
    cityId: profile ? (profile.cityId ?? "") : (cityId ?? ""),
    timezone: profile?.timezone ?? "Asia/Kolkata",
    sessionTypes: profile?.sessionTypes ?? ["career_guidance"],
    defaultDurationMin: DURATIONS.find((d) => d === duration) ?? "30",
    isAccepting: profile?.isAccepting ?? true,
    skillIds: profile?.skillIds ?? [],
  };
}

export default async function MentorProfilePage() {
  const viewer = await requireViewer("/mentor/profile");
  const [profile, cities, skills] = await Promise.all([getMentorProfile(viewer.id), getCities(), getSkills()]);
  const timeZones = getTimeZoneOptions();
  // Keep a saved zone selectable even if this server's list does not include it.
  if (profile && !timeZones.includes(profile.timezone)) timeZones.push(profile.timezone);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div className="space-y-1">
        <Link href="/mentor" className="inline-flex min-h-11 items-center text-sm text-primary hover:underline">
          {s.back}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{profile ? s.profile.titleEdit : s.profile.titleNew}</h1>
        {!profile && <p className="text-muted-foreground">{s.profile.introNew}</p>}
      </div>
      <MentorProfileForm
        isNew={!profile}
        defaults={formDefaults(profile, viewer.profile.city_id)}
        cities={cities}
        skills={skills}
        timeZones={timeZones}
      />
    </div>
  );
}
