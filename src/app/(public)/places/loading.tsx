import { Skeleton } from "@/components/ui/skeleton";
import { placesStrings as s } from "@/features/places/directory/strings";

export default function PlacesLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 pt-6 md:px-8" aria-busy="true" aria-label={s.loading}>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
