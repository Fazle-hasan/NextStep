import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { EmptyState } from "@/features/jobs/search/components/EmptyState";
import { getActiveCities } from "@/features/profiles/queries";
import { ActiveSwitch } from "@/features/settle-in/flatmates/components/ActiveSwitch";
import { FlatmateProfileForm } from "@/features/settle-in/flatmates/components/FlatmateProfileForm";
import { MatchCard } from "@/features/settle-in/flatmates/components/MatchCard";
import { ProfileFacts } from "@/features/settle-in/flatmates/components/ProfileFacts";
import { profileFormDefaults } from "@/features/settle-in/flatmates/defaults";
import { GENDER_LABELS, PREFERRED_GENDER_LABELS } from "@/features/settle-in/flatmates/labels";
import {
  countPendingIncoming,
  getFlatmateMatches,
  getMyFlatmateProfile,
  getNeighbourhoodOptions,
} from "@/features/settle-in/flatmates/queries";
import { parseMatchesPage } from "@/features/settle-in/flatmates/schemas";
import { flatmateStrings as s } from "@/features/settle-in/flatmates/strings";

export const metadata: Metadata = { title: s.pageTitle };

export default async function FlatmatesPage({ searchParams }: PageProps<"/flatmates">) {
  const viewer = await requireViewer("/flatmates");
  const page = parseMatchesPage((await searchParams).page);
  const [profile, neighbourhoods] = await Promise.all([getMyFlatmateProfile(viewer.id), getNeighbourhoodOptions()]);
  const genderLabel = viewer.profile.gender ? GENDER_LABELS[viewer.profile.gender] : null;

  const header = (
    <header className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight">{s.pageTitle}</h1>
      <p className="text-muted-foreground">{s.pageIntro}</p>
      <p className="text-sm text-muted-foreground">{s.strictFilters}</p>
    </header>
  );

  if (!profile) {
    const cities = await getActiveCities();
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        {header}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              <h2>{s.noProfile.title}</h2>
            </CardTitle>
            <p className="text-sm text-muted-foreground">{s.noProfile.body}</p>
          </CardHeader>
          <CardContent>
            <FlatmateProfileForm
              defaults={profileFormDefaults(null, viewer.profile.city_id)}
              cities={cities}
              neighbourhoods={neighbourhoods}
              genderLabel={genderLabel}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const [{ matches, hasNext }, pendingIncoming] = await Promise.all([
    getFlatmateMatches(viewer.id, page),
    countPendingIncoming(viewer.id),
  ]);
  const areaName = new Map(neighbourhoods.map((area) => [area.id, area.name]));
  const namesOf = (ids: string[]) => ids.map((id) => areaName.get(id)).filter((name): name is string => Boolean(name));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {header}

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg">
            <h2>{s.mine.title}</h2>
            <Badge variant="outline">{PREFERRED_GENDER_LABELS[profile.preferred_gender]}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProfileFacts
            budgetMin={profile.budget_min}
            budgetMax={profile.budget_max}
            moveDate={profile.move_date}
            areaNames={namesOf(profile.neighbourhood_ids)}
            foodHabit={profile.food_habit}
            smokes={profile.smokes}
            sleepSchedule={profile.sleep_schedule}
            workSchedule={profile.work_schedule}
            cleanliness={profile.cleanliness}
            guestsPolicy={profile.guests_policy}
          />
          <ActiveSwitch isActive={profile.is_active} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="outline" className="h-11">
              <Link href="/flatmates/profile">{s.mine.edit}</Link>
            </Button>
            <Button asChild variant="outline" className="h-11">
              <Link href="/flatmates/requests">
                {s.mine.requests}
                {pendingIncoming > 0 && <Badge className="ml-2">{pendingIncoming}</Badge>}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="matches-heading" className="space-y-4">
        <h2 id="matches-heading" className="text-xl font-semibold">
          {s.matches.title}
        </h2>
        {!profile.is_active ? (
          <EmptyState title={s.matches.empty} body={s.mine.paused} />
        ) : matches.length === 0 ? (
          <EmptyState title={s.matches.empty} body={s.matches.emptyBody} />
        ) : (
          <ul className="space-y-4">
            {matches.map((match) => (
              <li key={match.userId}>
                <MatchCard match={match} areaNames={namesOf(match.neighbourhoodIds)} />
              </li>
            ))}
          </ul>
        )}

        {(page > 1 || hasNext) && (
          <nav aria-label={s.matches.pagination} className="flex items-center justify-between gap-3 pt-2">
            {page > 1 ? (
              <Button asChild variant="outline" className="h-11">
                <Link href={page === 2 ? "/flatmates" : `/flatmates?page=${page - 1}`} rel="prev">
                  {s.matches.previous}
                </Link>
              </Button>
            ) : (
              <span aria-hidden="true" />
            )}
            {hasNext ? (
              <Button asChild variant="outline" className="h-11">
                <Link href={`/flatmates?page=${page + 1}`} rel="next">
                  {s.matches.next}
                </Link>
              </Button>
            ) : (
              <span aria-hidden="true" />
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
