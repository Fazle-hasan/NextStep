import { Skeleton } from "@/components/ui/skeleton";
import { placesStrings } from "@/features/places/directory/strings";

export default function PlaceLoading() {
  return (
    <div
      className="mx-auto w-full max-w-3xl space-y-6 px-4 pt-6 md:px-8"
      aria-busy="true"
      aria-label={placesStrings.detail.loading}
    >
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
