import { Skeleton } from "@/components/ui/skeleton";
import { placesStrings } from "@/features/places/directory/strings";

export default function SuggestPlaceLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-5" aria-busy="true" aria-label={placesStrings.suggestForm.loading}>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-5 w-full" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
