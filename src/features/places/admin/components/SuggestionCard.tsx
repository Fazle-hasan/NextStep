import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewButtons } from "@/features/admin/components/ReviewButtons";
import { formatDate } from "@/lib/utils/dates";

import { reviewPlaceSuggestion } from "../actions";
import { placesAdminStrings } from "../strings";
import type { SuggestionRow } from "../types";

const s = placesAdminStrings.suggestions;

// One pending suggestion: what the member proposed (plain text only) and approve / reject.
export function SuggestionCard({ suggestion }: { suggestion: SuggestionRow }) {
  const isCorrection = suggestion.placeId !== null;
  const title = isCorrection ? (suggestion.placeName ?? s.correction) : (suggestion.fields[0]?.value ?? s.newPlace);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          <span className="break-words">{title}</span>
          <Badge variant="secondary">{isCorrection ? s.correction : s.newPlace}</Badge>
        </CardTitle>
        <CardDescription>
          {s.from} {suggestion.suggesterName ?? s.unknownMember} · {formatDate(suggestion.createdAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isCorrection && suggestion.placeId && (
          <p className="text-sm">
            {s.correctionFor}{" "}
            <Link href={`/admin/places/${suggestion.placeId}`} className="text-primary hover:underline">
              {suggestion.placeName ?? s.correction}
            </Link>
          </p>
        )}
        <dl className="space-y-2 text-sm">
          {suggestion.fields.map((field) => (
            <div key={field.label}>
              <dt className="font-medium">{field.label}</dt>
              <dd className="whitespace-pre-line break-words text-muted-foreground">{field.value}</dd>
            </div>
          ))}
        </dl>
        {suggestion.note && (
          <div className="text-sm">
            <p className="font-medium">{s.note}</p>
            <p className="whitespace-pre-line break-words text-muted-foreground">{suggestion.note}</p>
          </div>
        )}
        <ReviewButtons
          id={suggestion.id}
          subject={title}
          action={reviewPlaceSuggestion}
          rejectLabel={s.reject}
          reasonRequired={false}
        />
      </CardContent>
    </Card>
  );
}
