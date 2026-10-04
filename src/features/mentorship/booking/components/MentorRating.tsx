import { StarIcon } from "lucide-react";

import { bookingStrings as s } from "../strings";

type Props = { avg: number | null; count: number };

// "4.5 (12)" with a star, or "New mentor" when nobody has rated them yet.
export function MentorRating({ avg, count }: Props) {
  if (avg == null || count === 0) {
    return <span className="text-sm font-normal text-muted-foreground">{s.mentor.newMentor}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium">
      <StarIcon className="size-4 fill-current text-amber-500" aria-hidden="true" />
      <span className="sr-only">{s.mentor.ratingLabel(avg, count)}</span>
      <span aria-hidden="true">{s.mentor.rating(avg, count)}</span>
    </span>
  );
}
