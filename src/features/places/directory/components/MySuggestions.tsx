import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/dates";

import { placesStrings } from "../strings";
import type { MySuggestion } from "../types";

const s = placesStrings.mine;

function title(suggestion: MySuggestion): string {
  if (suggestion.placeId === null) return s.newPlace(suggestion.proposedName ?? "");
  return suggestion.placeName ? s.correctionFor(suggestion.placeName) : s.correctionRemoved;
}

// The viewer's own suggestions with the admin decision.
export function MySuggestions({ suggestions }: { suggestions: MySuggestion[] }) {
  return (
    <section aria-labelledby="my-suggestions" className="space-y-3">
      <h2 id="my-suggestions" className="text-lg font-semibold">
        {s.heading}
      </h2>
      {suggestions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.empty}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {suggestions.map((suggestion) => (
            <li key={suggestion.id} className="space-y-1 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 font-medium break-words">{title(suggestion)}</p>
                <Badge variant={suggestion.status === "approved" ? "default" : suggestion.status === "rejected" ? "outline" : "secondary"}>
                  {s.status[suggestion.status]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{formatDate(suggestion.createdAt)}</p>
              {suggestion.note && <p className="text-sm break-words whitespace-pre-line">{suggestion.note}</p>}
              {suggestion.reviewNote && (
                <p className="text-sm break-words">
                  <span className="font-medium">{s.reviewNote}: </span>
                  {suggestion.reviewNote}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
