import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

import { SESSION_TYPE_LABELS } from "../../labels";
import { bookingStrings as s } from "../strings";
import type { MentorSummary } from "../types";
import { MentorRating } from "./MentorRating";

// One mentor in the search results.
export function MentorCard({ mentor }: { mentor: MentorSummary }) {
  const name = mentor.name ?? s.mentor.unnamed;
  const facts = [s.mentor.years(mentor.yearsExperience), mentor.cityName, ...mentor.industries.slice(0, 3)].filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg">
          <span className="break-words">{name}</span>
          <MentorRating avg={mentor.ratingAvg} count={mentor.ratingCount} />
        </CardTitle>
        <CardDescription className="break-words">{mentor.headline}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm break-words text-muted-foreground">{facts.join(" · ")}</p>
        <ul className="flex flex-wrap gap-2" aria-label={s.mentor.offers}>
          {mentor.sessionTypes.map((type) => (
            <li key={type}>
              <Badge variant="secondary">{SESSION_TYPE_LABELS[type]}</Badge>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button asChild className="h-11 w-full sm:w-auto sm:px-6">
          <Link href={`/mentors/${mentor.id}`} aria-label={`${s.list.view}: ${name}`}>
            {s.list.view}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
